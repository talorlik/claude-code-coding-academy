/**
 * Integration tests for lib/dashboard/admin-queries.ts.
 *
 * Supabase client and auth guards are mocked; no live DB required.
 * Tests assert:
 * - Non-admin callers are rejected (redirect thrown).
 * - getAdminOverviewStats returns the expected shape.
 * - getCourseCompletionRates aggregates correctly.
 * - getStuckStudents reads from admin_stuck_students view.
 * - getCommonTutorQuestions normalizes and counts messages.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

// ---------------------------------------------------------------------------
// Mock auth guards
// ---------------------------------------------------------------------------

let mockIsInstructor = false
let mockUserId: string | null = null

vi.mock("@/lib/auth/roles", () => ({
  getCurrentUserRole: vi.fn().mockImplementation(() =>
    Promise.resolve({ userId: mockUserId, isInstructor: mockIsInstructor })
  ),
  isInstructor: vi.fn(),
}))

const mockRedirect = vi.fn().mockImplementation(() => {
  throw new Error("REDIRECT")
})

vi.mock("next-intl/server", () => ({
  getLocale: vi.fn().mockResolvedValue("en"),
}))

vi.mock("@/i18n/navigation", () => ({
  redirect: mockRedirect,
}))

// ---------------------------------------------------------------------------
// Mock Supabase
// ---------------------------------------------------------------------------

const mockData: Record<string, { data: unknown; count?: number | null; error: null }> = {}

let lastTable = ""

type Builder = {
  select: (..._args: unknown[]) => Builder
  eq: (_col: string, _val: unknown) => Builder
  not: (_col: string, _op: string, _val: unknown) => Builder
  in: (_col: string, _vals: unknown[]) => Builder
  order: (_col: string, _opts?: unknown) => Builder
  limit: (_n: number) => Builder
  then: (_resolve: (v: unknown) => unknown) => Promise<unknown>
}

function makeBuilder(table: string): Builder {
  lastTable = table
  const builder: Builder = {
    select: () => builder,
    eq: () => builder,
    not: () => builder,
    in: () => builder,
    order: () => builder,
    limit: () => builder,
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

const {
  getAdminOverviewStats,
  getCourseCompletionRates,
  getStuckStudents,
  getCommonTutorQuestions,
} = await import("@/lib/dashboard/admin-queries")

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockIsInstructor = false
  mockUserId = null
  vi.clearAllMocks()
  for (const key of Object.keys(mockData)) {
    delete mockData[key]
  }
})

// ---------------------------------------------------------------------------
// Guard tests
// ---------------------------------------------------------------------------

describe("admin query guard", () => {
  it("rejects anonymous caller with REDIRECT", async () => {
    mockUserId = null
    mockIsInstructor = false
    await expect(getAdminOverviewStats()).rejects.toThrow("REDIRECT")
  })

  it("rejects a student caller with REDIRECT", async () => {
    mockUserId = "student-uuid"
    mockIsInstructor = false
    await expect(getAdminOverviewStats()).rejects.toThrow("REDIRECT")
  })

  it("allows an instructor caller through", async () => {
    mockUserId = "instructor-uuid"
    mockIsInstructor = true
    // Minimal mock so it doesn't throw on DB access.
    mockData["enrollments"] = { data: [], error: null, count: 0 }
    mockData["courses"] = { data: [], error: null, count: 0 }
    // Should not throw REDIRECT.
    await expect(getAdminOverviewStats()).resolves.toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// getAdminOverviewStats
// ---------------------------------------------------------------------------

describe("getAdminOverviewStats", () => {
  beforeEach(() => {
    mockUserId = "instructor-uuid"
    mockIsInstructor = true
  })

  it("returns shape with numeric fields and completionRate in [0,100]", async () => {
    mockData["enrollments"] = { data: [], error: null, count: 0 }
    mockData["courses"] = { data: [], error: null, count: 0 }

    const stats = await getAdminOverviewStats()
    expect(typeof stats.totalStudents).toBe("number")
    expect(typeof stats.totalEnrollments).toBe("number")
    expect(typeof stats.totalCourses).toBe("number")
    expect(stats.completionRate).toBeGreaterThanOrEqual(0)
    expect(stats.completionRate).toBeLessThanOrEqual(100)
  })

  it("returns 0 completionRate when there are no enrollments", async () => {
    mockData["enrollments"] = { data: [], error: null, count: 0 }
    mockData["courses"] = { data: [], error: null, count: 0 }

    const stats = await getAdminOverviewStats()
    expect(stats.completionRate).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// getCourseCompletionRates
// ---------------------------------------------------------------------------

describe("getCourseCompletionRates", () => {
  beforeEach(() => {
    mockUserId = "instructor-uuid"
    mockIsInstructor = true
  })

  it("returns empty array when there are no enrollments", async () => {
    mockData["enrollments"] = { data: [], error: null }
    const rates = await getCourseCompletionRates()
    expect(rates).toEqual([])
  })

  it("aggregates enrollments by course and computes completionPercent", async () => {
    mockData["enrollments"] = {
      data: [
        {
          course_id: "c1",
          completed_at: "2026-01-01T00:00:00Z",
          courses: { id: "c1", title: "Course One", slug: "course-one" },
        },
        {
          course_id: "c1",
          completed_at: null,
          courses: { id: "c1", title: "Course One", slug: "course-one" },
        },
        {
          course_id: "c1",
          completed_at: null,
          courses: { id: "c1", title: "Course One", slug: "course-one" },
        },
      ],
      error: null,
    }

    const rates = await getCourseCompletionRates()
    expect(rates).toHaveLength(1)
    expect(rates[0].courseTitle).toBe("Course One")
    expect(rates[0].totalEnrollments).toBe(3)
    expect(rates[0].completedEnrollments).toBe(1)
    expect(rates[0].completionPercent).toBe(33)
  })
})

// ---------------------------------------------------------------------------
// getStuckStudents
// ---------------------------------------------------------------------------

describe("getStuckStudents", () => {
  beforeEach(() => {
    mockUserId = "instructor-uuid"
    mockIsInstructor = true
  })

  it("reads from admin_stuck_students and returns shaped results", async () => {
    mockData["admin_stuck_students"] = {
      data: [
        {
          user_id: "u1",
          course_id: "c1",
          last_watched_at: "2026-05-01T00:00:00Z",
          days_inactive: 14,
          courses: { title: "Intro JS" },
          profiles: { email: "s@example.com", full_name: "Sam Student" },
        },
      ],
      error: null,
    }

    const students = await getStuckStudents()
    expect(students).toHaveLength(1)
    expect(students[0]).toMatchObject({
      userId: "u1",
      courseId: "c1",
      courseTitle: "Intro JS",
      email: "s@example.com",
      fullName: "Sam Student",
      daysInactive: 14,
    })
  })

  it("returns empty array when view returns no rows", async () => {
    mockData["admin_stuck_students"] = { data: [], error: null }
    const students = await getStuckStudents()
    expect(students).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// getCommonTutorQuestions
// ---------------------------------------------------------------------------

describe("getCommonTutorQuestions", () => {
  beforeEach(() => {
    mockUserId = "instructor-uuid"
    mockIsInstructor = true
  })

  it("returns empty array when there are no messages", async () => {
    mockData["ai_tutor_messages"] = { data: [], error: null }
    const qs = await getCommonTutorQuestions()
    expect(qs).toEqual([])
  })

  it("normalizes content by lowercasing and trimming before counting", async () => {
    mockData["ai_tutor_messages"] = {
      data: [
        { content: "What is a variable?", created_at: "2026-06-01T00:00:00Z" },
        { content: "  what is a variable?  ", created_at: "2026-06-02T00:00:00Z" },
        { content: "WHAT IS A VARIABLE?", created_at: "2026-06-03T00:00:00Z" },
        { content: "How do I use loops?", created_at: "2026-06-01T00:00:00Z" },
      ],
      error: null,
    }

    const qs = await getCommonTutorQuestions(10)
    // The three variations of "what is a variable?" should collapse into one.
    const varEntry = qs.find((q) => q.content === "what is a variable?")
    expect(varEntry).toBeDefined()
    expect(varEntry?.count).toBe(3)
  })

  it("returns results sorted by count descending", async () => {
    mockData["ai_tutor_messages"] = {
      data: [
        { content: "loop question", created_at: "2026-06-01T00:00:00Z" },
        { content: "variable question", created_at: "2026-06-01T00:00:00Z" },
        { content: "variable question", created_at: "2026-06-02T00:00:00Z" },
      ],
      error: null,
    }

    const qs = await getCommonTutorQuestions(10)
    expect(qs[0].content).toBe("variable question")
    expect(qs[0].count).toBe(2)
  })

  it("respects the limit parameter", async () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({
      content: `unique question ${i}`,
      created_at: "2026-06-01T00:00:00Z",
    }))
    mockData["ai_tutor_messages"] = { data: rows, error: null }

    const qs = await getCommonTutorQuestions(5)
    expect(qs).toHaveLength(5)
  })
})
