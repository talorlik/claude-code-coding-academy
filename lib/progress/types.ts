import type { Database } from "@/lib/supabase/database.types"

// ---------------------------------------------------------------------------
// Row type aliases
// ---------------------------------------------------------------------------

type LessonProgressRow = Database["public"]["Tables"]["lesson_progress"]["Row"]

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

/**
 * DTO for a single lesson-progress record. Represents one completed lesson
 * for a user within a course. Maps from the `lesson_progress` table row.
 */
export interface LessonProgressDTO {
  /** UUID primary key. */
  id: string
  /** User who watched the lesson. */
  userId: string
  /** Course the lesson belongs to. */
  courseId: string
  /** Lesson that was watched. */
  lessonId: string
  /** ISO timestamp when the lesson was marked as watched. */
  watchedAt: string
  /** ISO timestamp of row creation. */
  createdAt: string
}

/**
 * Aggregate progress summary for a user within a course.
 *
 * All numeric fields are integers; `percent` is rounded (see
 * {@link calculateCourseProgress} for the rounding decision).
 */
export interface CourseProgress {
  /** Total number of lessons in the course. */
  totalLessons: number
  /** Number of distinct lessons the user has watched. */
  completedLessons: number
  /**
   * Completion percentage as an integer in [0, 100].
   * Rounded with `Math.round`. Zero when `totalLessons` is 0.
   */
  percent: number
  /**
   * ISO timestamp of the most recently watched lesson, or null when no
   * lesson has been watched yet.
   */
  lastWatchedAt: string | null
  /** True when `completedLessons >= totalLessons` and `totalLessons > 0`. */
  isComplete: boolean
  /**
   * ID of the first lesson (by sort_order) not yet in `completedLessonIds`,
   * or null when all lessons are complete or the course has no lessons.
   */
  nextLessonId: string | null
}

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

/**
 * Maps a raw `lesson_progress` row to a {@link LessonProgressDTO}.
 */
export function toLessonProgressDTO(row: LessonProgressRow): LessonProgressDTO {
  return {
    id: row.id,
    userId: row.user_id,
    courseId: row.course_id,
    lessonId: row.lesson_id,
    watchedAt: row.watched_at,
    createdAt: row.created_at,
  }
}
