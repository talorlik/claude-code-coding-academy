/**
 * Integration tests for lib/catalog/queries.ts - getCatalog and getCategories.
 *
 * Tested invariants:
 * - Published-only base query (status = 'published').
 * - Search pushes an ILIKE `.or` filter into SQL.
 * - Category filter resolves the slug to an id, then filters by category_id;
 *   an unknown slug yields no results.
 * - Sort: popular orders by enrollment_count, rated by rating_average (nulls
 *   last), newest by created_at order.
 * - My-Courses filter restricts to enrolled courses (signed-in only).
 * - Per-viewer progress is surfaced for enrolled courses.
 *
 * The Supabase client is mocked with the project's thenable-builder pattern:
 * a `{ ...builder }` object whose chainable methods return the builder and
 * whose `then` trap resolves `await builder` to the table's mocked result.
 */

import { describe, expect, it, vi, beforeEach } from "vitest"

// ---------------------------------------------------------------------------
// Mock Supabase
// ---------------------------------------------------------------------------

type MockResult = { data: unknown; error: null | { message: string } }

// Result per table for an awaited builder (list queries).
const tableResults: Record<string, MockResult> = {}
// Result per table for `.maybeSingle()` (the category-slug lookup).
const maybeResults: Record<string, MockResult> = {}
let capturedOr: string | undefined
let capturedEq: Array<[string, unknown]> = []

function makeBuilder(table: string) {
  const b = {
    select: () => b,
    eq: (col: string, val: unknown) => {
      capturedEq.push([col, val])
      return b
    },
    or: (filter: string) => {
      capturedOr = filter
      return b
    },
    in: () => b,
    order: () => b,
    maybeSingle: () =>
      Promise.resolve(maybeResults[table] ?? { data: null, error: null }),
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve(tableResults[table] ?? { data: [], error: null }).then(
        resolve
      ),
  }
  return b
}

let mockUserId: string | null = null

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({ data: { user: mockUserId ? { id: mockUserId } : null } })
      ),
    },
    from: (table: string) => makeBuilder(table),
  }),
}))

vi.mock("next-intl/server", () => ({
  getLocale: vi.fn().mockResolvedValue("en"),
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const COURSE_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
const COURSE_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
const CAT_WEB = "c0000001-0000-0000-0000-000000000001"

function row(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    slug: `course-${id.slice(0, 4)}`,
    title: `Course ${id.slice(0, 4)}`,
    description: "desc",
    level: "beginner",
    status: "published",
    language: "en",
    cover_image_url: null,
    category_id: null,
    created_by: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

function seedTwoCourses() {
  // courses is ordered created_at desc in SQL; the mock returns them in array
  // order, so A is treated as "newest".
  tableResults["courses"] = { data: [row(COURSE_A), row(COURSE_B)], error: null }
  tableResults["course_lesson_counts"] = {
    data: [
      { course_id: COURSE_A, lesson_count: 3, total_duration_seconds: 100 },
      { course_id: COURSE_B, lesson_count: 5, total_duration_seconds: 200 },
    ],
    error: null,
  }
  tableResults["course_ratings"] = {
    data: [
      { course_id: COURSE_A, rating_average: 4.0, rating_count: 2 },
      { course_id: COURSE_B, rating_average: 5.0, rating_count: 1 },
    ],
    error: null,
  }
  tableResults["course_popularity"] = {
    data: [
      { course_id: COURSE_A, enrollment_count: 10 },
      { course_id: COURSE_B, enrollment_count: 2 },
    ],
    error: null,
  }
  tableResults["categories"] = {
    data: [
      { id: CAT_WEB, slug: "web-development", name_en: "Web Development", name_he: "פיתוח" },
    ],
    error: null,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getCatalog", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const k of Object.keys(tableResults)) delete tableResults[k]
    for (const k of Object.keys(maybeResults)) delete maybeResults[k]
    capturedOr = undefined
    capturedEq = []
    mockUserId = null
  })

  it("filters to published courses", async () => {
    seedTwoCourses()
    const { getCatalog } = await import("@/lib/catalog/queries")
    await getCatalog({})
    expect(capturedEq).toContainEqual(["status", "published"])
  })

  it("pushes an ILIKE or-filter for the search term", async () => {
    seedTwoCourses()
    const { getCatalog } = await import("@/lib/catalog/queries")
    await getCatalog({ q: "react" })
    expect(capturedOr).toBe("title.ilike.%react%,description.ilike.%react%")
  })

  it("returns no results for an unknown category slug", async () => {
    seedTwoCourses()
    maybeResults["categories"] = { data: null, error: null }
    const { getCatalog } = await import("@/lib/catalog/queries")
    const result = await getCatalog({ categorySlug: "does-not-exist" })
    expect(result).toEqual([])
  })

  it("sorts by enrollment_count for the popular sort", async () => {
    seedTwoCourses()
    const { getCatalog } = await import("@/lib/catalog/queries")
    const result = await getCatalog({ sort: "popular" })
    // A (10) before B (2).
    expect(result.map((c) => c.id)).toEqual([COURSE_A, COURSE_B])
  })

  it("sorts by rating_average for the rated sort", async () => {
    seedTwoCourses()
    const { getCatalog } = await import("@/lib/catalog/queries")
    const result = await getCatalog({ sort: "rated" })
    // B (5.0) before A (4.0).
    expect(result.map((c) => c.id)).toEqual([COURSE_B, COURSE_A])
  })

  it("orders nulls last for the rated sort", async () => {
    seedTwoCourses()
    tableResults["course_ratings"] = {
      data: [
        { course_id: COURSE_A, rating_average: null, rating_count: 0 },
        { course_id: COURSE_B, rating_average: 3.0, rating_count: 1 },
      ],
      error: null,
    }
    const { getCatalog } = await import("@/lib/catalog/queries")
    const result = await getCatalog({ sort: "rated" })
    expect(result.map((c) => c.id)).toEqual([COURSE_B, COURSE_A])
  })

  it("orders by created_at (newest first) for the newest sort", async () => {
    seedTwoCourses()
    const { getCatalog } = await import("@/lib/catalog/queries")
    const result = await getCatalog({ sort: "newest" })
    // courses array order = created_at desc, so A then B.
    expect(result.map((c) => c.id)).toEqual([COURSE_A, COURSE_B])
  })

  it("surfaces rating and enrollment aggregates on the DTO", async () => {
    seedTwoCourses()
    const { getCatalog } = await import("@/lib/catalog/queries")
    const result = await getCatalog({ sort: "newest" })
    const a = result.find((c) => c.id === COURSE_A)!
    expect(a.ratingAverage).toBe(4.0)
    expect(a.ratingCount).toBe(2)
    expect(a.enrollmentCount).toBe(10)
    // Anonymous viewer: not enrolled, no progress.
    expect(a.isEnrolled).toBe(false)
    expect(a.progressPercent).toBeNull()
  })

  it("restricts to enrolled courses when mine=true and a user is present", async () => {
    seedTwoCourses()
    mockUserId = "user-1"
    // The viewer is enrolled in B only; B has 5 lessons, 0 watched.
    tableResults["enrollments"] = { data: [{ course_id: COURSE_B }], error: null }
    tableResults["lesson_progress"] = { data: [], error: null }
    tableResults["lessons"] = {
      data: [
        { id: "l1", course_id: COURSE_B },
        { id: "l2", course_id: COURSE_B },
      ],
      error: null,
    }
    const { getCatalog } = await import("@/lib/catalog/queries")
    const result = await getCatalog({ mine: true, userId: "user-1" })
    expect(result.map((c) => c.id)).toEqual([COURSE_B])
    expect(result[0].isEnrolled).toBe(true)
    expect(result[0].progressPercent).toBe(0)
  })

  it("ignores mine when there is no user", async () => {
    seedTwoCourses()
    const { getCatalog } = await import("@/lib/catalog/queries")
    const result = await getCatalog({ mine: true, userId: null })
    expect(result.length).toBe(2)
  })

  it("returns [] when the base query errors", async () => {
    tableResults["courses"] = { data: null, error: { message: "boom" } }
    const { getCatalog } = await import("@/lib/catalog/queries")
    const result = await getCatalog({})
    expect(result).toEqual([])
  })
})

describe("getCategories", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const k of Object.keys(tableResults)) delete tableResults[k]
    mockUserId = null
  })

  it("returns localized category names", async () => {
    tableResults["categories"] = {
      data: [
        { id: CAT_WEB, slug: "web-development", name_en: "Web Development", name_he: "פיתוח" },
      ],
      error: null,
    }
    const { getCategories } = await import("@/lib/catalog/queries")
    const result = await getCategories()
    expect(result).toEqual([
      { id: CAT_WEB, slug: "web-development", name: "Web Development" },
    ])
  })
})
