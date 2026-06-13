/**
 * A single document returned by a full-text search query.
 * The `kind` discriminant determines which optional fields are present.
 */
export interface SearchResult {
  /**
   * Document kind. `"course"` results have no `courseSlug`; `"lesson"`
   * results carry the parent `courseSlug` to build deep-link URLs.
   */
  kind: "course" | "lesson"
  /** UUID of the matching course or lesson. */
  id: string
  /** URL-safe slug of the matching course or lesson. */
  slug: string
  /** Display title. */
  title: string
  /**
   * Slug of the parent course. Present when `kind === "lesson"`, absent
   * when `kind === "course"`.
   */
  courseSlug?: string
  /**
   * Short excerpt from the matching document body with the query term
   * in context, or null when no snippet was generated.
   */
  snippet?: string
}

/**
 * Wrapper returned by a search query, carrying the results list and the
 * original query string for display purposes.
 */
export interface SearchResults {
  /** The query that produced these results (trimmed). */
  query: string
  /** Ordered result set (relevance-ranked or chronological, per implementation). */
  results: SearchResult[]
  /** Total number of results before any pagination limit was applied. */
  total: number
}
