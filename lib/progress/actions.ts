"use server"

/**
 * Server actions for student progress tracking.
 *
 * All actions use the request-scoped Supabase client (RLS-enforced) and
 * authenticate via auth.uid() only - never trust a client-supplied user id.
 *
 * @module lib/progress/actions
 */

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { fail, ok } from "@/lib/types/action-result"
import type { ActionResult } from "@/lib/types/action-result"
import { markWatchedSchema } from "@/lib/validation/course"
import { parseWithSchema } from "@/lib/validation/parse"
import { calculateCourseProgress } from "@/lib/progress/calculate"
import type { CourseProgress } from "@/lib/progress/types"
import type { ProgressLesson } from "@/lib/progress/calculate"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Payload returned on successful mark-watched. */
export interface MarkWatchedResult {
  /** Updated progress aggregate for the course. */
  progress: CourseProgress
  /**
   * First incomplete lesson id by sort_order after this mark-watched, or null
   * when the course is now fully complete.
   */
  nextLessonId: string | null
  /** True when this mark-watched completed the last lesson in the course. */
  courseCompleted: boolean
}

// ---------------------------------------------------------------------------
// markLessonWatched
// ---------------------------------------------------------------------------

/**
 * Server action: mark a lesson as watched for the authenticated user.
 *
 * Auth: reads the session via createClient().auth.getUser(). Returns
 * fail("signInRequired") for unauthenticated callers so the client can route
 * to the login page without a server redirect.
 *
 * Enrollment: fails with fail("notEnrolled") when the user is not enrolled in
 * the course. Auto-enrollment is intentionally not done here (section 9.2 of
 * TECHNICAL_REQUIREMENTS.md).
 *
 * Idempotency: uses upsert with onConflict("user_id,lesson_id") +
 * ignoreDuplicates so marking an already-watched lesson is a no-op. The
 * returned progress accurately reflects the current state in all cases.
 *
 * Completion: sets enrollments.completed_at = now() when all lessons are
 * complete and completed_at was not already set. This is checked server-side
 * by comparing the completed count to the total lesson count.
 *
 * @param input - Object with courseId and lessonId (UUIDs).
 * @returns ok(MarkWatchedResult) or fail(message).
 */
export async function markLessonWatched(
  input: unknown
): Promise<ActionResult<MarkWatchedResult>> {
  const supabase = await createClient()

  // 1. Authenticate.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return fail<MarkWatchedResult>("signInRequired")
  }

  // 2. Validate input.
  const parsed = parseWithSchema(markWatchedSchema, input)
  if (!parsed.ok) {
    return fail<MarkWatchedResult>(parsed.message, parsed.fieldErrors)
  }

  const { courseId, lessonId } = parsed.data

  // 3. Verify enrollment (do NOT auto-enroll).
  const { data: enrollment, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("id, completed_at")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .maybeSingle()

  if (enrollmentError) {
    console.error("[progress/actions] markLessonWatched enrollment check:", enrollmentError)
    return fail<MarkWatchedResult>("Could not verify enrollment. Please try again.")
  }

  if (!enrollment) {
    return fail<MarkWatchedResult>("notEnrolled")
  }

  // 4. Verify the lesson belongs to a published course (defense-in-depth).
  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select("id, course_id, sort_order")
    .eq("id", lessonId)
    .eq("course_id", courseId)
    .maybeSingle()

  if (lessonError || !lesson) {
    console.error("[progress/actions] markLessonWatched lesson check:", lessonError)
    return fail<MarkWatchedResult>("lessonNotFound")
  }

  // 5. Insert lesson_progress idempotently.
  //    The unique(user_id, lesson_id) constraint makes a duplicate a no-op.
  const { error: progressError } = await supabase
    .from("lesson_progress")
    .upsert(
      { user_id: user.id, course_id: courseId, lesson_id: lessonId },
      { onConflict: "user_id,lesson_id", ignoreDuplicates: true }
    )

  if (progressError) {
    console.error("[progress/actions] markLessonWatched upsert:", progressError)
    return fail<MarkWatchedResult>("Could not save progress. Please try again.")
  }

  // 6. Update last_accessed_lesson_id.
  const { error: accessError } = await supabase
    .from("enrollments")
    .update({ last_accessed_lesson_id: lessonId })
    .eq("id", enrollment.id)

  if (accessError) {
    // Non-fatal: progress was saved. Log and continue.
    console.error("[progress/actions] markLessonWatched last_accessed update:", accessError)
  }

  // 7. Recompute progress to determine next lesson and completion state.
  const { data: allLessonsData } = await supabase
    .from("lessons")
    .select("id, sort_order")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true })

  const allLessons: ProgressLesson[] = (allLessonsData ?? []).map((l) => ({
    id: l.id,
    sortOrder: l.sort_order,
  }))

  const { data: progressRows } = await supabase
    .from("lesson_progress")
    .select("lesson_id, watched_at")
    .eq("user_id", user.id)
    .eq("course_id", courseId)

  const completedIds = new Set((progressRows ?? []).map((r) => r.lesson_id))
  const lastWatchedAt =
    (progressRows ?? []).length === 0
      ? null
      : (progressRows ?? []).reduce(
          (latest, r) => (r.watched_at > latest ? r.watched_at : latest),
          (progressRows ?? [])[0].watched_at
        )

  const progress = calculateCourseProgress(
    allLessons.length,
    completedIds,
    allLessons,
    lastWatchedAt
  )

  const nextLessonId = progress.nextLessonId

  // 8. Set completed_at when all lessons are done (only once).
  let courseCompleted = false
  if (progress.isComplete && !enrollment.completed_at) {
    const { error: completionError } = await supabase
      .from("enrollments")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", enrollment.id)

    if (completionError) {
      console.error("[progress/actions] markLessonWatched completed_at update:", completionError)
      // Non-fatal: progress is correct, completion stamp will retry on next call.
    } else {
      courseCompleted = true
    }
  } else if (progress.isComplete && enrollment.completed_at) {
    // Already completed previously.
    courseCompleted = true
  }

  // 9. Invalidate the course page cache so the next load shows fresh progress.
  revalidatePath(`/courses/${courseId}`)

  return ok<MarkWatchedResult>({ progress, nextLessonId, courseCompleted })
}
