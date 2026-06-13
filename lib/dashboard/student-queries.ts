/**
 * @file lib/dashboard/student-queries.ts
 *
 * Server-only module. All functions use the request-scoped Supabase client
 * (RLS applies). They scope results to the authenticated user via auth.uid()
 * enforced by RLS policies, with an explicit `user_id` filter as defense in
 * depth.
 *
 * Do NOT import this file from client components.
 */
import "server-only"

import { createClient } from "@/lib/supabase/server"
import {
  computeAchievementBadges,
  type Badge,
  type BadgeEnrollment,
} from "./badges"

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Returns an ISO string for now minus N days. */
function daysAgo(n: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString()
}

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

export interface EnrolledCourseWithProgress {
  enrollmentId: string
  courseId: string
  courseTitle: string
  courseSlug: string
  courseLevel: string
  completedLessons: number
  totalLessons: number
  percent: number
  lastWatchedAt: string | null
  completedAt: string | null
}

export interface WeeklyDaySummary {
  /** ISO date string YYYY-MM-DD */
  date: string
  count: number
}

export interface RecentlyWatchedLesson {
  lessonId: string
  lessonTitle: string
  lessonSlug: string
  courseId: string
  courseTitle: string
  courseSlug: string
  watchedAt: string
}

// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------

/**
 * Returns enrolled courses joined with per-user progress data.
 *
 * Fetches from `student_course_progress` view (joined with courses and the
 * `course_lesson_counts` view). RLS scopes the view to the current user;
 * the explicit `user_id` filter is defense in depth.
 *
 * @param userId - The authenticated user's UUID.
 */
export async function getEnrolledCoursesWithProgress(
  userId: string
): Promise<EnrolledCourseWithProgress[]> {
  const supabase = await createClient()

  // Fetch enrollments + course info in one query.
  const { data: enrollments, error: enrollError } = await supabase
    .from("enrollments")
    .select("id, course_id, completed_at, courses(id, title, slug, level)")
    .eq("user_id", userId)
    .order("enrolled_at", { ascending: false })

  if (enrollError || !enrollments) {
    console.error("[dashboard/student] getEnrolledCoursesWithProgress:", enrollError)
    return []
  }

  if (enrollments.length === 0) return []

  const courseIds = enrollments.map((e) => e.course_id)

  // Fetch progress view rows for this user + these courses.
  const { data: progressRows, error: progressError } = await supabase
    .from("student_course_progress")
    .select(
      "course_id, completed_lessons, total_lessons, progress_percent, last_watched_at"
    )
    .eq("user_id", userId)
    .in("course_id", courseIds)

  if (progressError) {
    console.error("[dashboard/student] student_course_progress:", progressError)
  }

  const progressMap = new Map(
    (progressRows ?? []).map((r) => [r.course_id, r])
  )

  return enrollments
    .map((e) => {
      const course = e.courses as {
        id: string
        title: string
        slug: string
        level: string
      } | null
      if (!course) return null

      const progress = progressMap.get(e.course_id)

      return {
        enrollmentId: e.id,
        courseId: course.id,
        courseTitle: course.title,
        courseSlug: course.slug,
        courseLevel: course.level,
        completedLessons: progress?.completed_lessons ?? 0,
        totalLessons: progress?.total_lessons ?? 0,
        percent: progress?.progress_percent ?? 0,
        lastWatchedAt: progress?.last_watched_at ?? null,
        completedAt: e.completed_at,
      }
    })
    .filter(Boolean) as EnrolledCourseWithProgress[]
}

/**
 * Returns daily lesson counts for the past 7 days.
 *
 * Groups `lesson_progress` rows by the date of `watched_at` for the
 * current user within the last 7 calendar days. Returns one entry per
 * distinct date (dates with zero activity are omitted).
 *
 * @param userId - The authenticated user's UUID.
 */
export async function getWeeklyProgressSummary(
  userId: string
): Promise<{ days: WeeklyDaySummary[]; totalCount: number }> {
  const supabase = await createClient()
  const since = daysAgo(7)

  const { data, error } = await supabase
    .from("lesson_progress")
    .select("watched_at")
    .eq("user_id", userId)
    .gte("watched_at", since)
    .order("watched_at", { ascending: true })

  if (error) {
    console.error("[dashboard/student] getWeeklyProgressSummary:", error)
    return { days: [], totalCount: 0 }
  }

  const rows = data ?? []
  const dayMap = new Map<string, number>()

  for (const row of rows) {
    const date = row.watched_at.slice(0, 10) // YYYY-MM-DD
    dayMap.set(date, (dayMap.get(date) ?? 0) + 1)
  }

  const days: WeeklyDaySummary[] = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))

  return { days, totalCount: rows.length }
}

/**
 * Returns the most recently watched lessons for a user, newest first.
 *
 * Joins `lesson_progress` with `lessons` and `courses` to get display
 * titles and slugs needed to render continue-links.
 *
 * @param userId - The authenticated user's UUID.
 * @param limit  - Maximum number of rows to return (default 5).
 */
export async function getRecentlyWatchedLessons(
  userId: string,
  limit = 5
): Promise<RecentlyWatchedLesson[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("lesson_progress")
    .select(
      "lesson_id, watched_at, course_id, lessons(id, title, slug, course_id, courses(id, title, slug))"
    )
    .eq("user_id", userId)
    .order("watched_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("[dashboard/student] getRecentlyWatchedLessons:", error)
    return []
  }

  return (data ?? [])
    .map((row) => {
      const lesson = row.lessons as {
        id: string
        title: string
        slug: string
        course_id: string
        courses: { id: string; title: string; slug: string } | null
      } | null
      if (!lesson || !lesson.courses) return null

      return {
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        lessonSlug: lesson.slug,
        courseId: lesson.courses.id,
        courseTitle: lesson.courses.title,
        courseSlug: lesson.courses.slug,
        watchedAt: row.watched_at,
      }
    })
    .filter(Boolean) as RecentlyWatchedLesson[]
}

/**
 * Fetches all data needed to compute achievement badges for the user, then
 * returns the computed badge list.
 *
 * Badge computation is delegated to the pure function
 * {@link computeAchievementBadges} in `lib/dashboard/badges.ts`.
 *
 * @param userId - The authenticated user's UUID.
 */
export async function getAchievementBadges(userId: string): Promise<Badge[]> {
  const supabase = await createClient()
  const since = daysAgo(7)

  const [{ data: enrollments, error: enrollError }, { data: weeklyRows, error: weeklyError }] =
    await Promise.all([
      supabase
        .from("enrollments")
        .select("completed_at, courses(level)")
        .eq("user_id", userId),
      supabase
        .from("lesson_progress")
        .select("id")
        .eq("user_id", userId)
        .gte("watched_at", since),
    ])

  if (enrollError) {
    console.error("[dashboard/student] getAchievementBadges enrollments:", enrollError)
  }
  if (weeklyError) {
    console.error("[dashboard/student] getAchievementBadges weekly:", weeklyError)
  }

  const badgeEnrollments: BadgeEnrollment[] = (enrollments ?? []).map((e) => {
    const course = e.courses as { level: string } | null
    return {
      completedAt: e.completed_at,
      courseLevel: course?.level ?? null,
    }
  })

  return computeAchievementBadges(badgeEnrollments, (weeklyRows ?? []).length)
}
