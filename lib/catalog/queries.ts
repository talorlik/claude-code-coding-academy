import "server-only"

import { getLocale } from "next-intl/server"

import { createClient } from "@/lib/supabase/server"
import { calculateCourseProgress } from "@/lib/progress/calculate"
import type { CatalogCategory, CatalogCourse, CatalogSort } from "./types"
import { toCatalogCourse } from "./types"

/**
 * Arguments for {@link getCatalog}. All filters are optional; an absent filter
 * means "no constraint".
 */
export interface GetCatalogArgs {
  /** Course-level search term (ILIKE on title/description). */
  q?: string
  /** Category slug filter. */
  categorySlug?: string
  /** When true, restrict to courses the `userId` is enrolled in. */
  mine?: boolean
  /** Sort order. Defaults to "popular". */
  sort?: CatalogSort
  /** The viewer's user id, or null/undefined for an anonymous request. */
  userId?: string | null
}

/**
 * Returns the localized category list for the catalog filter UI, ordered by
 * `sort_order`. The display `name` is resolved to the active locale here so the
 * UI never branches on locale. Reads through the RLS request client (categories
 * are public-readable). Returns an empty array on error.
 */
export async function getCategories(): Promise<CatalogCategory[]> {
  const supabase = await createClient()
  const locale = await getLocale()

  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name_en, name_he")
    .order("sort_order", { ascending: true })

  if (error || !data) {
    console.error("[catalog/queries] getCategories:", error)
    return []
  }

  return data.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: locale === "he" ? row.name_he : row.name_en,
  }))
}

/**
 * Loads the published-course catalog with all catalog aggregates applied.
 *
 * One published-courses read (with category join and optional ILIKE search and
 * category filter pushed into SQL), then the rating, popularity, lesson-count,
 * and category-name aggregates are merged in from their views by id (the
 * project does not use PostgREST relational embeds). When `userId` is supplied,
 * the viewer's enrollments and lesson progress are layered on so enrolled cards
 * can show a progress bar; the "My Courses" filter (`mine`) restricts the set
 * to enrolled courses. Sorting is applied after the merge because the sort keys
 * (popularity, rating) live in separate views.
 *
 * All reads go through the RLS request client, so only published courses and
 * permitted rows are ever visible. Returns an empty array on error - the page
 * renders an empty state rather than throwing.
 *
 * @param args - Filters, sort, and the viewer id. See {@link GetCatalogArgs}.
 */
export async function getCatalog({
  q,
  categorySlug,
  mine = false,
  sort = "popular",
  userId = null,
}: GetCatalogArgs): Promise<CatalogCourse[]> {
  const supabase = await createClient()
  const locale = await getLocale()

  // Resolve a category slug to its id up front (the courses table stores
  // category_id, not the slug). An unknown slug yields no results.
  let categoryId: string | null = null
  if (categorySlug) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", categorySlug)
      .maybeSingle()
    if (!cat) return []
    categoryId = cat.id
  }

  // Base published-course query, ordered newest-first in SQL. Search and
  // category filters are pushed into SQL; the popular/rated sorts are applied
  // in JS after merging the view aggregates. The created_at order also gives a
  // chronological key for the "newest" sort and the tiebreaker without adding
  // created_at to the catalog DTO.
  let query = supabase
    .from("courses")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false })
  if (categoryId) query = query.eq("category_id", categoryId)
  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`)

  const { data: courses, error } = await query
  if (error || !courses) {
    console.error("[catalog/queries] getCatalog:", error)
    return []
  }
  if (courses.length === 0) return []

  const courseIds = courses.map((c) => c.id)
  // Chronological rank: 0 = newest (courses is already created_at desc).
  const newestRank = new Map(courseIds.map((id, i) => [id, i]))

  // Aggregates from the views + categories, fetched in parallel.
  const [countsRes, ratingsRes, popularityRes, categoriesRes] =
    await Promise.all([
      supabase
        .from("course_lesson_counts")
        .select("course_id, lesson_count, total_duration_seconds")
        .in("course_id", courseIds),
      supabase
        .from("course_ratings")
        .select("course_id, rating_average, rating_count")
        .in("course_id", courseIds),
      supabase
        .from("course_popularity")
        .select("course_id, enrollment_count")
        .in("course_id", courseIds),
      supabase.from("categories").select("id, slug, name_en, name_he"),
    ])

  const countMap = new Map(
    (countsRes.data ?? []).map((r) => [
      r.course_id,
      {
        lessonCount: r.lesson_count ?? 0,
        totalDurationSeconds: r.total_duration_seconds ?? null,
      },
    ])
  )
  const ratingMap = new Map(
    (ratingsRes.data ?? []).map((r) => [
      r.course_id,
      {
        ratingAverage: r.rating_average,
        ratingCount: r.rating_count ?? 0,
      },
    ])
  )
  const popularityMap = new Map(
    (popularityRes.data ?? []).map((r) => [
      r.course_id,
      r.enrollment_count ?? 0,
    ])
  )
  const categoryMap = new Map(
    (categoriesRes.data ?? []).map((r) => [
      r.id,
      { slug: r.slug, name: locale === "he" ? r.name_he : r.name_en },
    ])
  )

  // Per-viewer enrollment + progress. Only fetched when a user is present.
  const enrolledCourseIds = new Set<string>()
  const progressByCourse = new Map<string, number>()
  if (userId) {
    const [{ data: enrollments }, { data: progressRows }, { data: lessonRows }] =
      await Promise.all([
        supabase
          .from("enrollments")
          .select("course_id")
          .eq("user_id", userId)
          .in("course_id", courseIds),
        supabase
          .from("lesson_progress")
          .select("course_id, lesson_id")
          .eq("user_id", userId)
          .in("course_id", courseIds),
        supabase
          .from("lessons")
          .select("id, course_id")
          .in("course_id", courseIds),
      ])

    for (const e of enrollments ?? []) enrolledCourseIds.add(e.course_id)

    // Completed lesson ids per course, and total lessons per course, feed the
    // shared pure progress calculator so percent matches the rest of the app.
    const completedByCourse = new Map<string, Set<string>>()
    for (const p of progressRows ?? []) {
      const set = completedByCourse.get(p.course_id) ?? new Set<string>()
      set.add(p.lesson_id)
      completedByCourse.set(p.course_id, set)
    }
    const totalByCourse = new Map<string, number>()
    for (const l of lessonRows ?? []) {
      totalByCourse.set(l.course_id, (totalByCourse.get(l.course_id) ?? 0) + 1)
    }
    for (const courseId of enrolledCourseIds) {
      const total = totalByCourse.get(courseId) ?? 0
      const completed = completedByCourse.get(courseId) ?? new Set<string>()
      progressByCourse.set(
        courseId,
        calculateCourseProgress(total, completed).percent
      )
    }
  }

  let result: CatalogCourse[] = courses.map((course) => {
    const counts = countMap.get(course.id) ?? {
      lessonCount: 0,
      totalDurationSeconds: null,
    }
    const rating = ratingMap.get(course.id) ?? {
      ratingAverage: null,
      ratingCount: 0,
    }
    const category = course.category_id
      ? categoryMap.get(course.category_id)
      : undefined
    const isEnrolled = enrolledCourseIds.has(course.id)

    return toCatalogCourse(
      course,
      counts.lessonCount,
      counts.totalDurationSeconds,
      {
        categorySlug: category?.slug ?? null,
        categoryName: category?.name ?? null,
        ratingAverage: rating.ratingAverage,
        ratingCount: rating.ratingCount,
        enrollmentCount: popularityMap.get(course.id) ?? 0,
        progressPercent: isEnrolled
          ? (progressByCourse.get(course.id) ?? 0)
          : null,
        isEnrolled,
      }
    )
  })

  // My-Courses filter: only meaningful for a signed-in viewer.
  if (mine && userId) {
    result = result.filter((c) => c.isEnrolled)
  }

  // Sort after the merge (popularity/rating live in separate views). Ties fall
  // back to newest (created_at rank) so ordering is deterministic.
  const byNewest = (a: CatalogCourse, b: CatalogCourse) =>
    (newestRank.get(a.id) ?? 0) - (newestRank.get(b.id) ?? 0)

  result.sort((a, b) => {
    if (sort === "rated") {
      const ra = a.ratingAverage ?? -1
      const rb = b.ratingAverage ?? -1
      if (rb !== ra) return rb - ra
    } else if (sort === "popular") {
      if (b.enrollmentCount !== a.enrollmentCount) {
        return b.enrollmentCount - a.enrollmentCount
      }
    }
    return byNewest(a, b)
  })

  return result
}
