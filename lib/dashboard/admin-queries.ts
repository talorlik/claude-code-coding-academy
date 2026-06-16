/**
 * @file lib/dashboard/admin-queries.ts
 *
 * Server-only module for admin/instructor dashboard analytics.
 *
 * Every exported function asserts instructor status via {@link requireAdmin}
 * before querying. Uses the request-scoped Supabase client (RLS applies);
 * no service-role access is used. Admin RLS policies (batch 02) grant
 * instructors read access across all enrollments, lesson_progress, and
 * ai_tutor_messages rows.
 *
 * Do NOT import this file from client components.
 */
import "server-only"

import { requireAdmin } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

export interface AdminOverviewStats {
  totalStudents: number
  totalEnrollments: number
  totalCourses: number
  /** Completion rate as a percentage integer in [0, 100]. */
  completionRate: number
}

export interface CourseCompletionRate {
  courseId: string
  courseTitle: string
  courseSlug: string
  totalEnrollments: number
  completedEnrollments: number
  completionPercent: number
}

export interface StuckStudent {
  userId: string
  courseId: string
  courseTitle: string
  email: string | null
  fullName: string | null
  lastWatchedAt: string | null
  daysInactive: number
}

export interface CommonTutorQuestion {
  content: string
  count: number
  lastAskedAt: string
}

export interface RecentActivityItem {
  type: "enrollment" | "lesson_watched"
  userId: string
  email: string | null
  fullName: string | null
  courseId: string
  courseTitle: string
  lessonTitle: string | null
  occurredAt: string
}

// ---------------------------------------------------------------------------
// Guard helper
// ---------------------------------------------------------------------------

/**
 * Asserts the current request is from an instructor. Throws/redirects
 * otherwise. Called at the start of every public function in this module.
 */
async function assertAdmin(): Promise<void> {
  await requireAdmin()
}

// ---------------------------------------------------------------------------
// Query functions
// ---------------------------------------------------------------------------

/**
 * Returns top-level overview stats for the admin dashboard.
 *
 * - Total distinct students (enrolled users who are NOT instructors).
 * - Total enrollments owned by non-instructor users.
 * - Total published courses.
 * - Overall completion rate (completed enrollments / total enrollments), both
 *   restricted to non-instructor enrollments.
 *
 * The student and enrollment counts come from the `admin_overview_counts`
 * security-definer RPC (migration 0005), which excludes any enroller holding the
 * instructor role at the DB layer. This avoids fetching all enrollment rows into
 * JS and prevents the instructor account from inflating the counts.
 */
export async function getAdminOverviewStats(): Promise<AdminOverviewStats> {
  await assertAdmin()
  const supabase = await createClient()

  const [
    { data: overviewRows, error: overviewError },
    { count: totalCourses, error: coursesError },
  ] = await Promise.all([
    supabase.rpc("admin_overview_counts"),
    supabase
      .from("courses")
      .select("id", { count: "exact", head: true })
      .eq("status", "published"),
  ])

  if (overviewError)
    console.error("[dashboard/admin] getAdminOverviewStats overview:", overviewError)
  if (coursesError)
    console.error("[dashboard/admin] getAdminOverviewStats courses:", coursesError)

  // The RPC returns a one-row table. Read its first row, falling back to zeros
  // when the caller is not an admin (empty result) or on error.
  const overview = overviewRows?.[0]
  const enrollCount = Number(overview?.enrollment_count ?? 0)
  const completedCount = Number(overview?.completed_count ?? 0)
  const distinctStudents = Number(overview?.student_count ?? 0)

  return {
    totalStudents: distinctStudents,
    totalEnrollments: enrollCount,
    totalCourses: totalCourses ?? 0,
    completionRate:
      enrollCount === 0
        ? 0
        : Math.round((completedCount / enrollCount) * 100),
  }
}

/**
 * Returns per-course completion rates.
 *
 * Reads the `admin_course_completion_counts` security-definer RPC (migration
 * 0005), which aggregates `enrollments` joined with `courses` at the DB layer
 * EXCLUDING any enrollment owned by an instructor-role user. Only courses with
 * at least one non-instructor enrollment appear. The completion percentage is
 * derived in JS from the returned totals.
 *
 * @param courseFilter - Optional course ID to filter results to one course.
 */
export async function getCourseCompletionRates(
  courseFilter?: string
): Promise<CourseCompletionRate[]> {
  await assertAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("admin_course_completion_counts")

  if (error) {
    console.error("[dashboard/admin] getCourseCompletionRates:", error)
    return []
  }

  const rows = courseFilter
    ? (data ?? []).filter((r) => r.course_id === courseFilter)
    : (data ?? [])

  return rows.map((r) => {
    const total = Number(r.total_enrollments ?? 0)
    const completed = Number(r.completed_enrollments ?? 0)
    return {
      courseId: r.course_id,
      courseTitle: r.course_title,
      courseSlug: r.course_slug,
      totalEnrollments: total,
      completedEnrollments: completed,
      completionPercent: total === 0 ? 0 : Math.round((completed / total) * 100),
    }
  })
}

/**
 * Returns students who have been inactive (no lesson watched) for over 7 days.
 *
 * Reads from the `admin_stuck_students` view (batch 02), joined with
 * `profiles` for email/name and `courses` for course title.
 *
 * Limited to 50 rows by default.
 */
export async function getStuckStudents(limit = 50): Promise<StuckStudent[]> {
  await assertAdmin()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("admin_stuck_students")
    .select(
      "user_id, course_id, last_watched_at, days_inactive, courses(title), profiles(email, full_name)"
    )
    .order("days_inactive", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("[dashboard/admin] getStuckStudents:", error)
    return []
  }

  return (data ?? [])
    .map((row) => {
      const course = row.courses as { title: string } | null
      const profile = row.profiles as {
        email: string | null
        full_name: string | null
      } | null

      return {
        userId: row.user_id ?? "",
        courseId: row.course_id ?? "",
        courseTitle: course?.title ?? "",
        email: profile?.email ?? null,
        fullName: profile?.full_name ?? null,
        lastWatchedAt: row.last_watched_at,
        daysInactive: row.days_inactive ?? 0,
      }
    })
    .filter((r) => r.userId && r.courseId)
}

/**
 * Returns the most common student AI tutor questions.
 *
 * Reads `ai_tutor_messages` directly (role = 'user'), normalizes content
 * (lowercase + trim), counts occurrences, and returns the top N by count.
 *
 * Normalization is intentionally simple: duplicates only collapse when the
 * text is byte-identical after lowercasing and trimming. More sophisticated
 * clustering is deferred.
 *
 * @param limit - Maximum distinct questions to return (default 10).
 */
export async function getCommonTutorQuestions(
  limit = 10
): Promise<CommonTutorQuestion[]> {
  await assertAdmin()
  const supabase = await createClient()

  // Fetch all user messages. In production this could be paginated; keeping
  // it simple given the expected message volume for an academy.
  const { data, error } = await supabase
    .from("ai_tutor_messages")
    .select("content, created_at")
    .eq("role", "user")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[dashboard/admin] getCommonTutorQuestions:", error)
    return []
  }

  type Accum = { count: number; lastAskedAt: string }
  const questionMap = new Map<string, Accum>()

  for (const row of data ?? []) {
    const normalized = row.content.trim().toLowerCase()
    if (!normalized) continue

    const existing = questionMap.get(normalized)
    if (existing) {
      existing.count++
      // created_at is ISO string; keep newest.
      if (row.created_at > existing.lastAskedAt) {
        existing.lastAskedAt = row.created_at
      }
    } else {
      questionMap.set(normalized, { count: 1, lastAskedAt: row.created_at })
    }
  }

  return Array.from(questionMap.entries())
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, limit)
    .map(([content, { count, lastAskedAt }]) => ({
      content,
      count,
      lastAskedAt,
    }))
}

/**
 * Returns a mixed feed of recent activity across all students.
 *
 * Fetches the most recent enrollments and the most recent lesson_progress
 * rows (admin-visible via RLS), merges them into a single chronological
 * feed, and returns the top `limit` items newest-first.
 *
 * @param limit - Maximum items in the merged feed (default 10).
 */
export async function getRecentCourseActivity(
  limit = 10
): Promise<RecentActivityItem[]> {
  await assertAdmin()
  const supabase = await createClient()

  const [
    { data: enrollData, error: enrollError },
    { data: progressData, error: progressError },
  ] = await Promise.all([
    supabase
      .from("enrollments")
      .select(
        "user_id, enrolled_at, course_id, courses(title), profiles(email, full_name)"
      )
      .order("enrolled_at", { ascending: false })
      .limit(limit),
    supabase
      .from("lesson_progress")
      .select(
        "user_id, watched_at, course_id, lesson_id, courses(title), lessons(title), profiles(email, full_name)"
      )
      .order("watched_at", { ascending: false })
      .limit(limit),
  ])

  if (enrollError)
    console.error("[dashboard/admin] getRecentCourseActivity enrollments:", enrollError)
  if (progressError)
    console.error("[dashboard/admin] getRecentCourseActivity progress:", progressError)

  const items: RecentActivityItem[] = []

  for (const row of enrollData ?? []) {
    const course = row.courses as { title: string } | null
    const profile = row.profiles as {
      email: string | null
      full_name: string | null
    } | null
    if (!course) continue
    items.push({
      type: "enrollment",
      userId: row.user_id,
      email: profile?.email ?? null,
      fullName: profile?.full_name ?? null,
      courseId: row.course_id,
      courseTitle: course.title,
      lessonTitle: null,
      occurredAt: row.enrolled_at,
    })
  }

  for (const row of progressData ?? []) {
    const course = row.courses as { title: string } | null
    const lesson = row.lessons as { title: string } | null
    const profile = row.profiles as {
      email: string | null
      full_name: string | null
    } | null
    if (!course) continue
    items.push({
      type: "lesson_watched",
      userId: row.user_id,
      email: profile?.email ?? null,
      fullName: profile?.full_name ?? null,
      courseId: row.course_id,
      courseTitle: course.title,
      lessonTitle: lesson?.title ?? null,
      occurredAt: row.watched_at,
    })
  }

  // Sort merged feed and return top `limit`.
  return items
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
    .slice(0, limit)
}
