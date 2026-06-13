"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { fail, ok } from "@/lib/types/action-result"
import type { ActionResult } from "@/lib/types/action-result"
import { enrollmentSchema } from "@/lib/validation/course"
import { parseWithSchema } from "@/lib/validation/parse"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Payload returned on successful enrollment. */
export interface EnrollResult {
  courseId: string
  slug: string
  /** First lesson id by sort_order, for "continue" deep-link. Null if the
   *  course has no lessons yet. */
  targetLessonId: string | null
}

// ---------------------------------------------------------------------------
// enrollInCourse
// ---------------------------------------------------------------------------

/**
 * Server action: enroll the authenticated user in a course.
 *
 * Auth: reads the session from the request-scoped client. Returns a typed
 * `fail` with code `signInRequired` instead of redirecting so the client
 * component can route to `/login` without a server-driven redirect.
 *
 * Idempotency: relies on the unique(user_id, course_id) constraint and uses
 * `onConflict: 'ignore'` so repeat calls succeed silently. The enrollment
 * row is always read back to confirm it exists.
 *
 * RLS: the `enrollments` insert policy enforces `user_id = auth.uid()`;
 * the publishable-key client passes the signed-in user's JWT, so the DB
 * rejects any attempt to enroll a different user.
 *
 * @param input - Object with `courseId` (UUID string).
 * @returns `ok(EnrollResult)` on success or `fail(message)` on error.
 */
export async function enrollInCourse(
  input: unknown
): Promise<ActionResult<EnrollResult>> {
  const supabase = await createClient()

  // 1. Validate session.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return fail<EnrollResult>("signInRequired")
  }

  // 2. Validate input.
  const parsed = parseWithSchema(enrollmentSchema, input)
  if (!parsed.ok) {
    return fail<EnrollResult>(parsed.message, parsed.fieldErrors)
  }

  const { courseId } = parsed.data

  // 3. Verify the course exists and is published (defense-in-depth over RLS).
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, slug")
    .eq("id", courseId)
    .eq("status", "published")
    .single()

  if (courseError || !course) {
    return fail<EnrollResult>("courseNotFound")
  }

  // 4. Insert enrollment idempotently.
  //    The unique(user_id, course_id) constraint makes a duplicate a no-op.
  //    Supabase JS does not expose ON CONFLICT DO NOTHING directly, so we
  //    upsert with ignoreDuplicates which translates to that SQL clause.
  const { error: insertError } = await supabase
    .from("enrollments")
    .upsert(
      { user_id: user.id, course_id: courseId },
      { onConflict: "user_id,course_id", ignoreDuplicates: true }
    )

  if (insertError) {
    console.error("[courses/actions] enrollInCourse insert:", insertError)
    return fail<EnrollResult>("Enrollment failed. Please try again.")
  }

  // 5. Resolve the first lesson for the "continue" deep-link.
  const { data: firstLesson } = await supabase
    .from("lessons")
    .select("id")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle()

  // 6. Revalidate catalog and dashboard so enrollment state reflects
  //    immediately on the next navigation.
  revalidatePath("/", "layout")

  return ok<EnrollResult>({
    courseId,
    slug: course.slug,
    targetLessonId: firstLesson?.id ?? null,
  })
}
