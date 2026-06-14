import type { LessonSummary } from "./types"

/**
 * Filters a course's lessons by a free-text query, matching case-insensitively
 * against each lesson's title and description. A blank/whitespace query returns
 * the list unchanged (show all), so the in-course search degrades to the full
 * lesson list. Pure and side-effect-free - the search UI and its unit test both
 * call it.
 *
 * @param lessons - The lessons to filter (order is preserved).
 * @param query - The raw search term.
 * @returns The subset whose title or description contains `query`.
 */
export function filterLessons<T extends Pick<LessonSummary, "title" | "description">>(
  lessons: T[],
  query: string
): T[] {
  const q = query.trim().toLowerCase()
  if (q === "") return lessons
  return lessons.filter((lesson) => {
    const haystack = `${lesson.title} ${lesson.description ?? ""}`.toLowerCase()
    return haystack.includes(q)
  })
}
