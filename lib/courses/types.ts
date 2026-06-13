import type { Database } from "@/lib/supabase/database.types"

// ---------------------------------------------------------------------------
// Row type aliases (snake_case, direct from generated types)
// ---------------------------------------------------------------------------

type CourseRow = Database["public"]["Tables"]["courses"]["Row"]
type LessonRow = Database["public"]["Tables"]["lessons"]["Row"]

// ---------------------------------------------------------------------------
// Enum aliases (re-exported from the generated Database types so callers
// never repeat the long access path and mismatches are caught at compile time)
// ---------------------------------------------------------------------------

/**
 * Course difficulty level. Mirrors the `course_level` Postgres enum.
 */
export type CourseLevel = Database["public"]["Enums"]["course_level"]

/**
 * Course lifecycle status. Mirrors the `course_status` Postgres enum.
 */
export type CourseStatus = Database["public"]["Enums"]["course_status"]

// ---------------------------------------------------------------------------
// Lesson DTOs
// ---------------------------------------------------------------------------

/**
 * Lightweight lesson DTO used in course catalog cards and ordered lesson lists.
 * Snake_case DB columns are mapped to camelCase for UI consumption.
 */
export interface LessonSummary {
  /** UUID primary key. */
  id: string
  /** URL-safe slug, unique within a course. */
  slug: string
  /** Display title. */
  title: string
  /** Optional short description. */
  description: string | null
  /** YouTube video id (11 chars). */
  youtubeVideoId: string
  /** Full YouTube watch URL. */
  youtubeUrl: string
  /** Duration in seconds, or null when not yet resolved. */
  durationSeconds: number | null
  /** Thumbnail URL, or null when not set. */
  thumbnailUrl: string | null
  /** Zero-based display order within the course. */
  sortOrder: number
  /** Whether the lesson is viewable without enrollment. */
  isPreview: boolean
}

/**
 * Full lesson DTO including timestamps. Used in admin and lesson-detail views.
 */
export interface Lesson extends LessonSummary {
  /** Course this lesson belongs to. */
  courseId: string
  /** ISO timestamp of creation. */
  createdAt: string
  /** ISO timestamp of last update. */
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Course DTOs
// ---------------------------------------------------------------------------

/**
 * Lightweight course DTO used in catalog cards. Does not include the full
 * lesson list to keep list responses small. `created_by` is intentionally
 * omitted - instructor identity is not exposed in public catalog reads.
 */
export interface CourseSummary {
  /** UUID primary key. */
  id: string
  /** URL-safe slug, unique across all courses. */
  slug: string
  /** Display title. */
  title: string
  /** Short description shown on the catalog card. */
  description: string
  /** Difficulty level. */
  level: CourseLevel
  /** Publication status. */
  status: CourseStatus
  /** Content language code (e.g. "en", "he", "mixed"). */
  language: string
  /** Cover image URL, or null when not set. */
  coverImageUrl: string | null
  /**
   * Total number of lessons in this course.
   * Populated from the `course_lesson_counts` view when available, or
   * computed from a joined query.
   */
  lessonCount: number
  /**
   * Sum of all lesson durations in seconds.
   * Populated from the `course_lesson_counts` view; null when unknown.
   */
  totalDurationSeconds: number | null
}

/**
 * Full course DTO including the ordered lesson list and counts.
 * Used in course-detail and enrollment pages.
 */
export interface CourseDetail extends CourseSummary {
  /** Lessons ordered by `sort_order` ascending. */
  lessons: LessonSummary[]
  /** ISO timestamp of creation. */
  createdAt: string
  /** ISO timestamp of last update. */
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Mapper functions (DB row -> DTO)
// ---------------------------------------------------------------------------

/**
 * Maps a raw `lessons` row to a {@link LessonSummary} DTO.
 * No private fields are exposed; all snake_case keys become camelCase.
 */
export function toLessonSummary(row: LessonRow): LessonSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    youtubeVideoId: row.youtube_video_id,
    youtubeUrl: row.youtube_url,
    durationSeconds: row.duration_seconds,
    thumbnailUrl: row.thumbnail_url,
    sortOrder: row.sort_order,
    isPreview: row.is_preview,
  }
}

/**
 * Maps a raw `lessons` row to a full {@link Lesson} DTO including timestamps.
 */
export function toLesson(row: LessonRow): Lesson {
  return {
    ...toLessonSummary(row),
    courseId: row.course_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/**
 * Maps a raw `courses` row to a {@link CourseSummary} DTO.
 *
 * `lessonCount` and `totalDurationSeconds` are not present on the raw row;
 * callers must supply them from the `course_lesson_counts` view or an
 * aggregate query. Pass `0` and `null` respectively when not yet available.
 */
export function toCourseSummary(
  row: CourseRow,
  lessonCount: number,
  totalDurationSeconds: number | null
): CourseSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    level: row.level,
    status: row.status,
    language: row.language,
    coverImageUrl: row.cover_image_url,
    lessonCount,
    totalDurationSeconds,
  }
}

/**
 * Maps a raw `courses` row plus ordered lesson rows to a {@link CourseDetail} DTO.
 *
 * Lessons should already be ordered by `sort_order` ascending before this
 * function is called; the mapper trusts the supplied order.
 */
export function toCourseDetail(
  row: CourseRow,
  lessons: LessonRow[],
  totalDurationSeconds: number | null
): CourseDetail {
  return {
    ...toCourseSummary(row, lessons.length, totalDurationSeconds),
    lessons: lessons.map(toLessonSummary),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
