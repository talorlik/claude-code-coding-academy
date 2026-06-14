import type { Database } from "@/lib/supabase/database.types"
import type { CourseSummary } from "@/lib/courses/types"
import { toCourseSummary } from "@/lib/courses/types"

type CourseRow = Database["public"]["Tables"]["courses"]["Row"]

/**
 * Sort options for the courses catalog. Mirrors the values the catalog query
 * accepts and the `sort` query-param enum in `lib/validation/catalog.ts`.
 *
 * - `popular` - by `course_popularity.enrollment_count` (most enrolled first).
 * - `rated` - by `course_ratings.rating_average` (highest first, nulls last).
 * - `newest` - by `courses.created_at` (most recent first).
 */
export type CatalogSort = "popular" | "rated" | "newest"

/**
 * A category as surfaced to the catalog filter UI. `name` is already resolved
 * to the active locale by the query layer (from `name_en` / `name_he`), so the
 * UI never branches on locale.
 */
export interface CatalogCategory {
  /** UUID primary key. */
  id: string
  /** URL-safe slug used as the `?category=` filter value. */
  slug: string
  /** Localized display name (resolved from name_en/name_he). */
  name: string
}

/**
 * A catalog course card DTO: a {@link CourseSummary} plus the catalog-only
 * fields the `/courses` page needs - category, aggregate rating, popularity,
 * and (for a signed-in viewer enrolled in the course) progress.
 *
 * `ratingAverage` is `null` when the course has no reviews (do not render it as
 * 0 stars). `progressPercent`/`isEnrolled` are only meaningful when a `userId`
 * was supplied to the query; otherwise `progressPercent` is null and
 * `isEnrolled` is false.
 */
export interface CatalogCourse extends CourseSummary {
  /** Category slug, or null when the course is uncategorized. */
  categorySlug: string | null
  /** Localized category name, or null when uncategorized. */
  categoryName: string | null
  /** Average rating (1-5), or null when there are no reviews. */
  ratingAverage: number | null
  /** Number of reviews backing {@link ratingAverage}. */
  ratingCount: number
  /** Number of enrollments (the "Most popular" sort key). */
  enrollmentCount: number
  /** Completion percent [0,100] for the viewer, or null when not enrolled. */
  progressPercent: number | null
  /** Whether the viewer is enrolled in this course. */
  isEnrolled: boolean
}

/**
 * Extra catalog fields layered on top of a {@link CourseSummary} by
 * {@link toCatalogCourse}.
 */
export interface CatalogExtras {
  categorySlug: string | null
  categoryName: string | null
  ratingAverage: number | null
  ratingCount: number
  enrollmentCount: number
  progressPercent: number | null
  isEnrolled: boolean
}

/**
 * Maps a raw `courses` row plus its aggregates to a {@link CatalogCourse}.
 *
 * Reuses {@link toCourseSummary} for the base fields so the catalog DTO stays
 * in lockstep with the course card contract, then layers the catalog extras
 * on top. The caller supplies all aggregates (lesson counts, rating,
 * popularity, per-viewer progress) from the joined views.
 *
 * @param row - The raw `courses` row.
 * @param lessonCount - From `course_lesson_counts`.
 * @param totalDurationSeconds - From `course_lesson_counts`, or null.
 * @param extras - Catalog-only aggregates (category, rating, popularity,
 *   progress).
 */
export function toCatalogCourse(
  row: CourseRow,
  lessonCount: number,
  totalDurationSeconds: number | null,
  extras: CatalogExtras
): CatalogCourse {
  return {
    ...toCourseSummary(row, lessonCount, totalDurationSeconds),
    ...extras,
  }
}
