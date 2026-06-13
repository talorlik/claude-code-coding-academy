import type { CourseProgress } from "./types"

/**
 * Minimal shape of a lesson needed by the progress calculator.
 * Callers supply only the fields that affect calculation logic.
 */
export interface ProgressLesson {
  /** UUID primary key, matched against `completedLessonIds`. */
  id: string
  /** Ascending display order used to determine `nextLessonId`. */
  sortOrder: number
}

/**
 * Computes a {@link CourseProgress} summary from raw counts and lesson data.
 *
 * ## Design decisions
 *
 * **Zero lessons:** A course with no lessons returns `{ percent: 0,
 * isComplete: false, nextLessonId: null }`. Treating an empty course as
 * "complete" would incorrectly award certificates before any content exists.
 *
 * **Integer percent:** `percent` is `Math.round(completed / total * 100)`,
 * clamped to `[0, 100]`. Integer rounding avoids floating-point display noise
 * (e.g. "66.666...%"). The rounding can cause a 1-unit off-by-one at certain
 * fractions, which is acceptable for a progress display.
 *
 * **`nextLessonId`:** The first lesson (by ascending `sortOrder`) not present
 * in `completedLessonIds`. When all lessons are complete or the course is
 * empty, `nextLessonId` is `null`.
 *
 * **`lastWatchedAt`:** Callers supply this from the DB (`student_course_progress`
 * view or a `MAX(watched_at)` query). This function does not derive it from
 * the lesson set because it has no access to timestamps.
 *
 * @param totalLessons - Total number of lessons in the course.
 * @param completedLessonIds - Set (or array) of lesson IDs the user has watched.
 * @param lessons - Ordered lesson stubs used to find `nextLessonId`.
 *   If omitted, `nextLessonId` will be `null` even when the course is not
 *   complete.
 * @param lastWatchedAt - ISO timestamp of the most recently watched lesson,
 *   or null when no lesson has been watched.
 */
export function calculateCourseProgress(
  totalLessons: number,
  completedLessonIds: string[] | Set<string>,
  lessons?: ProgressLesson[],
  lastWatchedAt: string | null = null
): CourseProgress {
  const completedSet =
    completedLessonIds instanceof Set
      ? completedLessonIds
      : new Set(completedLessonIds)

  const completedLessons = completedSet.size

  // Zero-lesson guard: treat as not-started rather than complete.
  if (totalLessons === 0) {
    return {
      totalLessons: 0,
      completedLessons: 0,
      percent: 0,
      lastWatchedAt,
      isComplete: false,
      nextLessonId: null,
    }
  }

  const rawPercent = (completedLessons / totalLessons) * 100
  const percent = Math.min(100, Math.max(0, Math.round(rawPercent)))
  const isComplete = completedLessons >= totalLessons

  // Determine the next unwatched lesson by ascending sort_order.
  let nextLessonId: string | null = null
  if (!isComplete && lessons && lessons.length > 0) {
    const sorted = [...lessons].sort((a, b) => a.sortOrder - b.sortOrder)
    const next = sorted.find((l) => !completedSet.has(l.id))
    nextLessonId = next?.id ?? null
  }

  return {
    totalLessons,
    completedLessons,
    percent,
    lastWatchedAt,
    isComplete,
    nextLessonId,
  }
}
