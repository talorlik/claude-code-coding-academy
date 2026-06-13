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
   * UUID of the parent course. Used internally to resolve courseSlug.
   * Present when `kind === "lesson"`, absent when `kind === "course"`.
   */
  courseId?: string
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
 * Grouped search results returned by {@link searchPublished}.
 *
 * Results are split into `courses` and `lessons` to support grouped display
 * in the search UI. Both arrays are title-match-prioritised.
 */
export interface SearchResults {
  /** Matching published courses. */
  courses: SearchResult[]
  /** Matching published lessons with `courseSlug` resolved. */
  lessons: SearchResult[]
}
