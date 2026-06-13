/**
 * @file lib/admin/queries.ts
 *
 * Server-only admin read functions for the course management UI.
 *
 * Uses the request-scoped Supabase client (createClient) so RLS is enforced.
 * An instructor can read courses and lessons in any status via the DB policy
 * `private.is_admin()`. Students are denied by RLS.
 *
 * Never import this module from client components.
 */

import { createClient } from "@/lib/supabase/server"
import type { CourseSummary, LessonSummary } from "@/lib/courses/types"
import { toCourseSummary, toLessonSummary } from "@/lib/courses/types"

// ---------------------------------------------------------------------------
// Course admin reads
// ---------------------------------------------------------------------------

/**
 * Admin course row including lesson count and creation timestamp.
 * Extends {@link CourseSummary} with fields useful for the admin table.
 */
export interface AdminCourseSummary extends CourseSummary {
  /** Total number of lessons (all statuses). */
  lessonCount: number
  /** ISO timestamp of creation, for display in the admin table. */
  createdAt: string
}

/**
 * Returns ALL courses (draft + published + archived) with lesson counts,
 * ordered by `created_at` descending. Only accessible to instructors via RLS.
 *
 * This does NOT filter by status so instructors can manage courses at every
 * lifecycle stage.
 *
 * @returns Ordered array of admin course summaries. Empty array on error (logged).
 */
export async function listAllCourses(): Promise<AdminCourseSummary[]> {
  const supabase = await createClient()

  const { data: courses, error } = await supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false })

  if (error || !courses) {
    console.error("[admin/queries] listAllCourses:", error)
    return []
  }

  if (courses.length === 0) return []

  // Fetch lesson counts in one query.
  const courseIds = courses.map((c) => c.id)
  const { data: counts } = await supabase
    .from("course_lesson_counts")
    .select("course_id, lesson_count")
    .in("course_id", courseIds)

  const countMap = new Map(
    (counts ?? []).map((row) => [row.course_id, row.lesson_count ?? 0])
  )

  return courses.map((course) => {
    const lessonCount = countMap.get(course.id) ?? 0
    const summary = toCourseSummary(course, lessonCount, null)
    return { ...summary, lessonCount, createdAt: course.created_at }
  })
}

/**
 * Returns the full course row for editing. Includes all statuses.
 *
 * Returns `null` when:
 * - No course with the given id exists.
 * - RLS denies access (non-instructor caller).
 *
 * @param id - Course UUID.
 */
export async function getCourseForEdit(id: string): Promise<CourseSummary | null> {
  const supabase = await createClient()

  const { data: course, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !course) {
    if (error?.code !== "PGRST116") {
      console.error("[admin/queries] getCourseForEdit:", error)
    }
    return null
  }

  return toCourseSummary(course, 0, null)
}

/**
 * Returns all lessons for a given course, ordered by `sort_order` ascending.
 * Includes all statuses (preview and non-preview).
 *
 * Returns an empty array when the course has no lessons or does not exist.
 *
 * @param courseId - Parent course UUID.
 */
export async function listLessonsForCourse(
  courseId: string
): Promise<LessonSummary[]> {
  const supabase = await createClient()

  const { data: lessons, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true })

  if (error || !lessons) {
    console.error("[admin/queries] listLessonsForCourse:", error)
    return []
  }

  return lessons.map(toLessonSummary)
}
