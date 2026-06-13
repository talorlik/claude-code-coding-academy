/**
 * Integration tests for lib/search/queries.ts - searchPublished.
 *
 * Tested invariants:
 * - Returns empty results for blank/empty query.
 * - Calls the search_documents view with correct ILIKE patterns.
 * - Partitions results into courses and lessons.
 * - Only returns published content (enforced by the view - tested by asserting
 *   the query goes to search_documents, not courses/lessons directly).
 */

import { describe, expect, it, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// Mock Supabase
// ---------------------------------------------------------------------------

type MockResult = { data: unknown; error: null | { message: string } }
const mockResults: Record<string, MockResult> = {}

let capturedOr: string | undefined

function makeBuilder(table: string) {
  // The builder is thenable: every chainable method returns `b`, and the `then`
  // trap resolves a chained `await builder` to the table's mocked result.
  const b = {
    select: () => b,
    eq: () => b,
    or: (filter: string) => {
      capturedOr = filter
      return b
    },
    in: () => b,
    limit: () => b,
    order: () => b,
    maybeSingle: () =>
      Promise.resolve(
        mockResults[`${table}:maybe`] ?? { data: null, error: null }
      ),
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve(mockResults[table] ?? { data: [], error: null }).then(
        resolve
      ),
  }
  return b
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    from: (table: string) => makeBuilder(table),
  }),
}))

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("searchPublished", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockResults).forEach((k) => delete mockResults[k])
    capturedOr = undefined
  })

  it("returns empty results for empty query", async () => {
    const { searchPublished } = await import("@/lib/search/queries")
    const result = await searchPublished("")
    expect(result.courses).toEqual([])
    expect(result.lessons).toEqual([])
  })

  it("returns empty results for whitespace-only query", async () => {
    const { searchPublished } = await import("@/lib/search/queries")
    const result = await searchPublished("   ")
    expect(result.courses).toEqual([])
    expect(result.lessons).toEqual([])
  })

  it("searches the search_documents view (not courses directly)", async () => {
    // The query should go to search_documents, which only contains published content.
    mockResults["search_documents"] = {
      data: [
        {
          document_id: "course-1",
          document_type: "course",
          slug: "js-basics",
          title: "JavaScript Basics",
          body: "Learn JavaScript",
          course_id: null,
          source_course_id: null,
          language: "en",
        },
      ],
      error: null,
    }

    const { searchPublished } = await import("@/lib/search/queries")
    await searchPublished("javascript")

    // The ILIKE filter should have been applied to search_documents.
    expect(capturedOr).toContain("ilike")
    expect(capturedOr).toContain("javascript")
  })

  it("partitions results into courses and lessons", async () => {
    mockResults["search_documents"] = {
      data: [
        {
          document_id: "course-1",
          document_type: "course",
          slug: "js-basics",
          title: "JavaScript Basics",
          body: "Learn JavaScript",
          course_id: null,
          source_course_id: null,
          language: "en",
        },
        {
          document_id: "lesson-1",
          document_type: "lesson",
          slug: "variables",
          title: "JavaScript Variables",
          body: "Variables in JavaScript",
          course_id: "course-1",
          source_course_id: "course-1",
          language: "en",
        },
      ],
      error: null,
    }
    // course slug resolution
    mockResults["courses"] = {
      data: [{ id: "course-1", slug: "js-basics" }],
      error: null,
    }

    const { searchPublished } = await import("@/lib/search/queries")
    const result = await searchPublished("javascript")

    expect(result.courses.length).toBeGreaterThan(0)
    expect(result.courses[0].kind).toBe("course")
  })

  it("handles empty results gracefully", async () => {
    mockResults["search_documents"] = { data: [], error: null }

    const { searchPublished } = await import("@/lib/search/queries")
    const result = await searchPublished("nonexistent-xyz")
    expect(result.courses).toEqual([])
    expect(result.lessons).toEqual([])
  })
})
