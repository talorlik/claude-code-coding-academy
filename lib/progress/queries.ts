import "server-only"
/**
 * Server-only progress query helpers.
 *
 * All functions use the request-scoped Supabase client so RLS applies and
 * every read is scoped to the authenticated user. Never call these with a
 * service-role client unless you have explicitly verified the caller's
 * identity first.
 *
 * @module lib/progress/queries
 */

import { createClient } from "@/lib/supabase/server"
import { calculateCourseProgress } from "@/lib/progress/calculate"
import type { ProgressLesson } from "@/lib/progress/calculate"
import type { CourseProgress } from "@/lib/progress/types"

// ---------------------------------------------------------------------------
// getEnrollment
// ---------------------------------------------------------------------------

/**
 * Returns the enrollment row for a (user, course) pair, or null when the
 * user is not enrolled.
 *
 * Uses the RLS-scoped client - the DB enforces that only the owner can read
 * their own enrollment rows.
 *
 * @param userId - The authenticated user's id (from auth.uid()).
 * @param courseId - UUID of the course to check.
 */
export async function getEnrollment(
  userId: string,
  courseId: string
): Promise<{
  id: string
  userId: string
  courseId: string
  lastAccessedLessonId: string | null
  completedAt: string | null
  enrolledAt: string
} | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("enrollments")
    .select(
      "id, user_id, course_id, last_accessed_lesson_id, completed_at, enrolled_at"
    )
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle()

  if (error) {
    console.error("[progress/queries] getEnrollment:", error)
    return null
  }

  if (!data) return null

  return {
    id: data.id,
    userId: data.user_id,
    courseId: data.course_id,
    lastAccessedLessonId: data.last_accessed_lesson_id,
    completedAt: data.completed_at,
    enrolledAt: data.enrolled_at,
  }
}

// ---------------------------------------------------------------------------
// getCourseProgress
// ---------------------------------------------------------------------------

/**
 * Reads all lesson_progress rows for (user, course) and returns the set of
 * completed lesson ids plus a {@link CourseProgress} aggregate.
 *
 * The `lessons` param is used to determine `nextLessonId`. Pass the ordered
 * lesson list from {@link getCourseDetailBySlug} so the calculation is
 * consistent with the UI order.
 *
 * Returns zero-progress when no rows exist yet (not an error).
 *
 * @param userId - The authenticated user's id.
 * @param courseId - UUID of the course.
 * @param lessons - Ordered lessons used to find nextLessonId.
 */
export async function getCourseProgress(
  userId: string,
  courseId: string,
  lessons: ProgressLesson[]
): Promise<{
  completedLessonIds: Set<string>
  progress: CourseProgress
}> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("lesson_progress")
    .select("lesson_id, watched_at")
    .eq("user_id", userId)
    .eq("course_id", courseId)

  if (error) {
    console.error("[progress/queries] getCourseProgress:", error)
    // Return empty progress rather than crashing the page render.
    return {
      completedLessonIds: new Set(),
      progress: calculateCourseProgress(lessons.length, new Set(), lessons),
    }
  }

  const rows = data ?? []
  const completedLessonIds = new Set(rows.map((r) => r.lesson_id))

  // Find the most recent watched_at timestamp for the progress summary.
  const lastWatchedAt =
    rows.length === 0
      ? null
      : rows.reduce(
          (latest, r) => (r.watched_at > latest ? r.watched_at : latest),
          rows[0].watched_at
        )

  const progress = calculateCourseProgress(
    lessons.length,
    completedLessonIds,
    lessons,
    lastWatchedAt
  )

  return { completedLessonIds, progress }
}
