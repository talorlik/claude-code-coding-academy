/**
 * @file lib/dashboard/badges.ts
 *
 * Pure badge computation. No I/O - takes already-fetched data and returns
 * which badges the user has earned. This module is import-safe in any
 * environment (server, client, test) because it has no side-effects.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BadgeId =
  | "first_course_completed"
  | "five_lessons_this_week"
  | "beginner_course_finished"

export interface Badge {
  id: BadgeId
  earned: boolean
}

/**
 * Minimal enrollment shape required by badge logic. Callers supply only the
 * fields the computation needs; full DTO types are not required.
 */
export interface BadgeEnrollment {
  completedAt: string | null
  courseLevel: string | null
}

// ---------------------------------------------------------------------------
// Pure computation
// ---------------------------------------------------------------------------

/**
 * Returns the earned/locked state for each achievement badge.
 *
 * All inputs are already-fetched values so this function is trivially unit
 * tested without any DB or async setup.
 *
 * Badge rules:
 * - `first_course_completed` - at least one enrollment with `completedAt` set.
 * - `five_lessons_this_week`  - `weeklyLessonCount` >= 5.
 * - `beginner_course_finished` - at least one completed enrollment whose
 *   `courseLevel` is `"beginner"`.
 *
 * @param enrollments - Enrollments for the current user (all; not filtered).
 * @param weeklyLessonCount - Count of lessons watched in the last 7 days.
 */
export function computeAchievementBadges(
  enrollments: BadgeEnrollment[],
  weeklyLessonCount: number
): Badge[] {
  const hasAnyCompleted = enrollments.some((e) => e.completedAt !== null)
  const hasBeginnerCompleted = enrollments.some(
    (e) => e.completedAt !== null && e.courseLevel === "beginner"
  )

  return [
    {
      id: "first_course_completed",
      earned: hasAnyCompleted,
    },
    {
      id: "five_lessons_this_week",
      earned: weeklyLessonCount >= 5,
    },
    {
      id: "beginner_course_finished",
      earned: hasBeginnerCompleted,
    },
  ]
}
