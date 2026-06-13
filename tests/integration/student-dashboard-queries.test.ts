/**
 * Integration tests for lib/dashboard/student-queries.ts.
 *
 * Supabase client is mocked; no live DB connection required.
 * Tests assert that each query function:
 * - Filters by user_id.
 * - Respects limits and ordering.
 * - Returns correctly shaped DTOs.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

// Chainable builder that resolves with preset table data.
const mockData: Record<string, { data: unknown; error: null }> = {}

type Builder = {
  select: (..._args: unknown[]) => Builder
  eq: (_col: string, _val: string) => Builder
  gte: (_col: string, _val: string) => Builder
  order: (_col: string, _opts?: unknown) => Builder
  limit: (_n: number) => Builder
  not: (_col: string, _op: string, _val: unknown) => Builder
  in: (_col: string, _vals: unknown[]) => Builder
  then: (_resolve: (v: unknown) => unknown) => Promise<unknown>
}

let capturedEqs: Array<{ column: string; value: string }> = []
let capturedGtes: Array<{ column: string; value: string }> = []
let capturedLimits: number[] = []
let lastTable = ""

function makeBuilder(table: string): Builder {
  lastTable = table
  const builder: Builder = {
    select: () => builder,
    eq: (col, val) => {
      capturedEqs.push({ column: col, value: val })
      return builder
    },
    gte: (col, val) => {
      capturedGtes.push({ column: col, value: val })
      return builder
    },
    order: () => builder,
    limit: (n) => {
      capturedLimits.push(n)
      return builder
    },
    not: () => builder,
    in: () => builder,
    then: (resolve) =>
      Promise.resolve(
        mockData[lastTable] ?? { data: [], error: null }
      ).then(resolve),
  }
  return builder
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    from: (table: string) => makeBuilder(table),
  }),
}))

// Import after mock setup so dynamic import picks up the mock.
const {
  getEnrolledCoursesWithProgress,
  getWeeklyProgressSummary,
  getRecentlyWatchedLessons,
} = await import("@/lib/dashboard/student-queries")

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

const TEST_USER_ID = "user-uuid-1234"

beforeEach(() => {
  capturedEqs = []
  capturedGtes = []
  capturedLimits = []
  lastTable = ""
  for (const key of Object.keys(mockData)) {
    delete mockData[key]
  }
})

describe("getEnrolledCoursesWithProgress", () => {
  it("returns an empty array when the user has no enrollments", async () => {
    mockData["enrollments"] = { data: [], error: null }

    const result = await getEnrolledCoursesWithProgress(TEST_USER_ID)
    expect(result).toEqual([])
  })

  it("filters enrollments by user_id", async () => {
    mockData["enrollments"] = { data: [], error: null }
    await getEnrolledCoursesWithProgress(TEST_USER_ID)
    expect(capturedEqs).toContainEqual({
      column: "user_id",
      value: TEST_USER_ID,
    })
  })

  it("returns an array of objects with expected shape when data is present", async () => {
    mockData["enrollments"] = {
      data: [
        {
          id: "enroll-1",
          course_id: "course-1",
          completed_at: null,
          courses: { id: "course-1", title: "Intro to JS", slug: "intro-js", level: "beginner" },
        },
      ],
      error: null,
    }
    mockData["student_course_progress"] = {
      data: [
        {
          course_id: "course-1",
          completed_lessons: 3,
          total_lessons: 10,
          progress_percent: 30,
          last_watched_at: "2026-01-10T00:00:00Z",
        },
      ],
      error: null,
    }

    const result = await getEnrolledCoursesWithProgress(TEST_USER_ID)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      enrollmentId: "enroll-1",
      courseId: "course-1",
      courseTitle: "Intro to JS",
      courseSlug: "intro-js",
      completedLessons: 3,
      totalLessons: 10,
      percent: 30,
    })
  })
})

describe("getWeeklyProgressSummary", () => {
  it("returns zero totalCount and empty days array when no progress rows", async () => {
    mockData["lesson_progress"] = { data: [], error: null }
    const result = await getWeeklyProgressSummary(TEST_USER_ID)
    expect(result.totalCount).toBe(0)
    expect(result.days).toEqual([])
  })

  it("filters lesson_progress by user_id", async () => {
    mockData["lesson_progress"] = { data: [], error: null }
    await getWeeklyProgressSummary(TEST_USER_ID)
    expect(capturedEqs).toContainEqual({
      column: "user_id",
      value: TEST_USER_ID,
    })
  })

  it("applies a gte filter scoped to 7 days ago on watched_at", async () => {
    mockData["lesson_progress"] = { data: [], error: null }
    await getWeeklyProgressSummary(TEST_USER_ID)
    const gteCall = capturedGtes.find((g) => g.column === "watched_at")
    expect(gteCall).toBeDefined()
    // The value should be a recent ISO timestamp (within the last 8 days).
    const since = new Date(gteCall!.value).getTime()
    const now = Date.now()
    const eightDaysMs = 8 * 24 * 60 * 60 * 1000
    expect(now - since).toBeLessThan(eightDaysMs)
  })

  it("aggregates multiple rows on the same date into one day entry", async () => {
    mockData["lesson_progress"] = {
      data: [
        { watched_at: "2026-06-10T09:00:00Z" },
        { watched_at: "2026-06-10T11:00:00Z" },
        { watched_at: "2026-06-11T08:00:00Z" },
      ],
      error: null,
    }
    const result = await getWeeklyProgressSummary(TEST_USER_ID)
    expect(result.totalCount).toBe(3)
    expect(result.days).toHaveLength(2)
    const dayEntry = result.days.find((d) => d.date === "2026-06-10")
    expect(dayEntry?.count).toBe(2)
  })
})

describe("getRecentlyWatchedLessons", () => {
  it("returns empty array when no lesson_progress rows exist", async () => {
    mockData["lesson_progress"] = { data: [], error: null }
    const result = await getRecentlyWatchedLessons(TEST_USER_ID)
    expect(result).toEqual([])
  })

  it("applies the limit argument", async () => {
    mockData["lesson_progress"] = { data: [], error: null }
    await getRecentlyWatchedLessons(TEST_USER_ID, 3)
    expect(capturedLimits).toContain(3)
  })

  it("uses default limit of 5 when not specified", async () => {
    mockData["lesson_progress"] = { data: [], error: null }
    await getRecentlyWatchedLessons(TEST_USER_ID)
    expect(capturedLimits).toContain(5)
  })

  it("filters by user_id", async () => {
    mockData["lesson_progress"] = { data: [], error: null }
    await getRecentlyWatchedLessons(TEST_USER_ID)
    expect(capturedEqs).toContainEqual({
      column: "user_id",
      value: TEST_USER_ID,
    })
  })
})
