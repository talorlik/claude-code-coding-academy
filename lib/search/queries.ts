"use server"

import { createClient } from "@/lib/supabase/server"
import type { SearchResult, SearchResults } from "@/lib/search/types"

// Maximum results returned per search. Keeps query load bounded.
const MAX_RESULTS = 20

/**
 * Search published courses and lessons via the `search_documents` view.
 *
 * Strategy: ILIKE on both `title` and `body` columns, with title matches
 * ranked first (title hits appear before body-only hits). The view has
 * `security_invoker = true` so RLS applies: only published documents are
 * returned for unauthenticated and student requests.
 *
 * Transcript search: the `body` column maps to the course/lesson description.
 * Full transcript search would require a separate `transcripts` column; that
 * is a no-op until transcripts are ingested into the view.
 *
 * @param query  - Raw user search string. Empty or blank -> empty results.
 * @param locale - Optional BCP-47 locale to filter by language column.
 *                 Pass undefined to search all languages.
 * @returns {@link SearchResults} with `courses` and `lessons` arrays.
 */
export async function searchPublished(
  query: string,
  locale?: string
): Promise<SearchResults> {
  const q = query.trim()

  if (!q) {
    return { courses: [], lessons: [] }
  }

  const supabase = await createClient()
  const pattern = `%${q}%`

  // Build a query that hits the search_documents view.
  // Title matches rank above body-only hits via a union-style approach:
  // we fetch title matches first, then body matches, and deduplicate.
  let dbQuery = supabase
    .from("search_documents")
    .select(
      "document_id, document_type, slug, title, body, course_id, source_course_id, language"
    )
    .or(`title.ilike.${pattern},body.ilike.${pattern}`)
    .limit(MAX_RESULTS)

  // Filter by language when a locale is provided.
  if (locale) {
    // The language column uses short codes ("en", "he"). Extract the first
    // segment of the BCP-47 locale tag (e.g. "en-US" -> "en").
    const lang = locale.split("-")[0]
    dbQuery = dbQuery.eq("language", lang)
  }

  const { data, error } = await dbQuery

  if (error) {
    console.error("[search/queries] searchPublished:", error)
    return { courses: [], lessons: [] }
  }

  const rows = data ?? []

  // Partition into courses and lessons, deduplicate by document_id,
  // and rank title matches above body-only matches within each partition.
  const seen = new Set<string>()
  const courses: SearchResult[] = []
  const lessons: SearchResult[] = []

  // Two passes: title matches first, then body-only matches.
  for (const prioritizeTitle of [true, false]) {
    for (const row of rows) {
      if (!row.document_id || !row.slug) continue
      if (seen.has(row.document_id)) continue

      const titleMatch = row.title
        ? row.title.toLowerCase().includes(q.toLowerCase())
        : false

      // In the title pass, skip rows that only match in body.
      if (prioritizeTitle && !titleMatch) continue
      // In the body pass, skip rows already added in the title pass.
      if (!prioritizeTitle && titleMatch) continue

      seen.add(row.document_id)

      // Generate a snippet from the body around the match term.
      const snippet = makeSnippet(row.body ?? null, q)

      const result: SearchResult = {
        kind: row.document_type === "lesson" ? "lesson" : "course",
        id: row.document_id,
        slug: row.slug,
        title: row.title ?? row.slug,
        snippet,
      }

      if (row.document_type === "course") {
        courses.push(result)
      } else {
        // For lessons, attach the parent course slug so the UI can build
        // the ?lesson= deep-link: /courses/<courseSlug>?lesson=<lessonSlug>
        // source_course_id refers to the parent course's ID; we need the slug.
        // The view exposes course_id (=lesson's course_id) and source_course_id.
        // We look up the slug from the courses row via a separate query below.
        result.courseId = row.source_course_id ?? row.course_id ?? undefined
        lessons.push(result)
      }
    }
  }

  // Resolve parent course slugs for lesson results in a single batched query.
  const courseIds = [
    ...new Set(
      lessons.map((l) => l.courseId).filter((id): id is string => !!id)
    ),
  ]

  if (courseIds.length > 0) {
    const { data: courseRows } = await supabase
      .from("courses")
      .select("id, slug")
      .in("id", courseIds)

    const slugMap = new Map(
      (courseRows ?? []).map((c) => [c.id, c.slug])
    )

    for (const lesson of lessons) {
      if (lesson.courseId) {
        lesson.courseSlug = slugMap.get(lesson.courseId)
      }
    }
  }

  return { courses, lessons }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extracts a short text snippet from `body` centred around the first
 * occurrence of `query`. Returns null when body is absent or the match
 * is not found.
 */
function makeSnippet(body: string | null, query: string): string | undefined {
  if (!body) return undefined

  const lower = body.toLowerCase()
  const idx = lower.indexOf(query.toLowerCase())
  if (idx === -1) return body.slice(0, 100)

  const start = Math.max(0, idx - 40)
  const end = Math.min(body.length, idx + query.length + 60)
  const excerpt = body.slice(start, end)

  return (start > 0 ? "..." : "") + excerpt + (end < body.length ? "..." : "")
}
