/**
 * Server-only course query functions.
 *
 * This module imports the server Supabase client (which reads request cookies)
 * and must only be called from Server Components, Route Handlers, and Server
 * Actions. Never import it from client components.
 *
 * All public reads filter `status = 'published'` explicitly in addition to
 * relying on RLS. Defense-in-depth: RLS already blocks anon reads of
 * non-published rows, but an explicit filter catches cases where a caller
 * passes a service-role client inadvertently.
 */

import { createClient } from "@/lib/supabase/server"
import type { CourseDetail, CourseSummary } from "./types"
import { toCourseDetail, toCourseSummary, toLessonSummary } from "./types"

/**
 * Returns all published courses with lesson counts and total durations.
 *
 * Fetches courses joined with the `course_lesson_counts` view in a single
 * round trip. Only `status = 'published'` rows are returned (RLS + explicit
 * filter). Results are ordered by `created_at` descending so the newest
 * course appears first in the catalog.
 *
 * @returns Ordered array of {@link CourseSummary} DTOs. Empty array when no
 *   published courses exist or on a DB error (errors are logged but not thrown
 *   to keep catalog renders non-fatal).
 */
export async function getPublishedCourses(): Promise<CourseSummary[]> {
  const supabase = await createClient()

  const { data: courses, error: coursesError } = await supabase
    .from("courses")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false })

  if (coursesError || !courses) {
    console.error("[courses/queries] getPublishedCourses:", coursesError)
    return []
  }

  if (courses.length === 0) return []

  // Fetch lesson counts for the returned course IDs in one query.
  const courseIds = courses.map((c) => c.id)
  const { data: counts } = await supabase
    .from("course_lesson_counts")
    .select("course_id, lesson_count, total_duration_seconds")
    .in("course_id", courseIds)

  const countMap = new Map(
    (counts ?? []).map((row) => [
      row.course_id,
      {
        lessonCount: row.lesson_count ?? 0,
        totalDurationSeconds: row.total_duration_seconds ?? null,
      },
    ])
  )

  return courses.map((course) => {
    const { lessonCount, totalDurationSeconds } = countMap.get(course.id) ?? {
      lessonCount: 0,
      totalDurationSeconds: null,
    }
    return toCourseSummary(course, lessonCount, totalDurationSeconds)
  })
}

/**
 * Returns the full detail of a published course including its ordered lessons.
 *
 * Fetches the course row and its lessons in parallel. Returns `null` when:
 * - No course with the given slug exists.
 * - The course exists but is not published.
 *
 * Lessons are ordered by `sort_order` ascending. `totalDurationSeconds` is
 * derived by summing `duration_seconds` across all lessons.
 *
 * @param slug - URL-safe course slug.
 */
export async function getCourseDetailBySlug(
  slug: string
): Promise<CourseDetail | null> {
  const supabase = await createClient()

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single()

  if (courseError || !course) {
    if (courseError?.code !== "PGRST116") {
      // PGRST116 = "Row not found" - expected when the course doesn't exist.
      console.error("[courses/queries] getCourseDetailBySlug:", courseError)
    }
    return null
  }

  const { data: lessons, error: lessonsError } = await supabase
    .from("lessons")
    .select("*")
    .eq("course_id", course.id)
    .order("sort_order", { ascending: true })

  if (lessonsError) {
    console.error("[courses/queries] getCourseDetailBySlug lessons:", lessonsError)
    return null
  }

  const lessonRows = lessons ?? []
  const totalDurationSeconds = lessonRows.reduce(
    (sum, l) => sum + (l.duration_seconds ?? 0),
    0
  )

  return toCourseDetail(
    course,
    lessonRows,
    totalDurationSeconds > 0 ? totalDurationSeconds : null
  )
}

/**
 * Looks up a single published course by slug without fetching lessons.
 * Useful when only course metadata is needed (e.g. enrollment checks).
 *
 * Returns `null` when the course does not exist or is not published.
 *
 * @param slug - URL-safe course slug.
 */
export async function getCourseBySlug(
  slug: string
): Promise<CourseSummary | null> {
  const supabase = await createClient()

  const [{ data: course, error: courseError }, { data: counts }] =
    await Promise.all([
      supabase
        .from("courses")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .single(),
      supabase
        .from("course_lesson_counts")
        .select("course_id, lesson_count, total_duration_seconds"),
    ])

  if (courseError || !course) {
    if (courseError?.code !== "PGRST116") {
      console.error("[courses/queries] getCourseBySlug:", courseError)
    }
    return null
  }

  const countRow = (counts ?? []).find((r) => r.course_id === course.id)
  return toCourseSummary(
    course,
    countRow?.lesson_count ?? 0,
    countRow?.total_duration_seconds ?? null
  )
}

/**
 * Looks up a single lesson by its slug within a course, given the course slug.
 *
 * Returns `null` when the course or lesson does not exist, or when the
 * parent course is not published.
 *
 * @param courseSlug - URL-safe slug of the parent course.
 * @param lessonSlug - URL-safe slug of the lesson.
 */
export async function getLessonBySlug(
  courseSlug: string,
  lessonSlug: string
) {
  const supabase = await createClient()

  // First fetch the published course to get its ID.
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id")
    .eq("slug", courseSlug)
    .eq("status", "published")
    .single()

  if (courseError || !course) return null

  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select("*")
    .eq("course_id", course.id)
    .eq("slug", lessonSlug)
    .single()

  if (lessonError || !lesson) return null

  return toLessonSummary(lesson)
}
