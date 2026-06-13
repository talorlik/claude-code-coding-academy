/**
 * Integration tests for lib/courses/queries.ts.
 *
 * The Supabase client is mocked via vi.mock so no live DB connection is
 * needed. The mock provides a chainable query builder stub that captures
 * the filter arguments passed by each query function.
 *
 * Tested invariants:
 * - getPublishedCourses always filters status='published'.
 * - getCourseDetailBySlug orders lessons by sort_order ascending.
 * - getCourseDetailBySlug returns null when the course row is not found.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

// A minimal chainable builder that records called methods and resolves to
// preset data. Each call to .from() starts a fresh chain by returning the
// same object. filter calls accumulate in the `calls` Map; the terminal
// promise resolves from `mockData`.
const mockData: Record<
  string,
  { data: unknown; error: null | { code?: string; message: string } }
> = {}

let eqCalls: Array<{ column: string; value: string }> = []
let orderCalls: Array<{ column: string; options: { ascending: boolean } }> = []
let inCalls: Array<{ column: string; values: string[] }> = []
let currentTable = ""

function makeBuilder(table: string) {
  currentTable = table
  eqCalls = []
  orderCalls = []
  inCalls = []

  const builder = {
    select: () => builder,
    eq: (col: string, val: string) => {
      eqCalls.push({ column: col, value: val })
      return builder
    },
    order: (col: string, opts: { ascending: boolean }) => {
      orderCalls.push({ column: col, options: opts })
      return builder
    },
    in: (col: string, vals: string[]) => {
      inCalls.push({ column: col, values: vals })
      return builder
    },
    single: () => {
      return Promise.resolve(mockData[currentTable] ?? { data: null, error: null })
    },
    then: (resolve: (v: unknown) => unknown) => {
      return Promise.resolve(
        mockData[currentTable] ?? { data: null, error: null }
      ).then(resolve)
    },
  }

  return builder
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    from: (table: string) => makeBuilder(table),
  }),
}))

// Import the module AFTER mock setup.
const { getPublishedCourses, getCourseDetailBySlug } = await import(
  "@/lib/courses/queries"
)

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------

function fakeCourse(overrides = {}) {
  return {
    id: "course-id-1",
    slug: "test-course",
    title: "Test Course",
    description: "A test course",
    level: "beginner" as const,
    status: "published" as const,
    language: "en",
    cover_image_url: null,
    created_by: "user-id-1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

function fakeLesson(sortOrder: number, overrides = {}) {
  return {
    id: `lesson-id-${sortOrder}`,
    course_id: "course-id-1",
    slug: `lesson-${sortOrder}`,
    title: `Lesson ${sortOrder}`,
    description: null,
    youtube_video_id: "dQw4w9WgXcQ",
    youtube_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    duration_seconds: 300,
    thumbnail_url: null,
    sort_order: sortOrder,
    is_preview: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// getPublishedCourses
// ---------------------------------------------------------------------------

describe("getPublishedCourses", () => {
  beforeEach(() => {
    // Reset recorded calls between tests.
    eqCalls = []
    orderCalls = []
    inCalls = []
  })

  it("filters status='published' when fetching courses", async () => {
    // Capture eq calls by intercepting the builder for the 'courses' table.
    const capturedEqCalls: typeof eqCalls = []

    const { createClient } = await import("@/lib/supabase/server")
    vi.mocked(createClient).mockResolvedValueOnce({
      from: (table: string) => {
        const b = makeBuilder(table)
        if (table === "courses") {
          const originalEq = b.eq.bind(b)
          b.eq = (col, val) => {
            capturedEqCalls.push({ column: col, value: val })
            return originalEq(col, val)
          }
        }
        return b as ReturnType<typeof makeBuilder>
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    // courses query returns empty array; course_lesson_counts returns empty.
    mockData["courses"] = { data: [], error: null }
    mockData["course_lesson_counts"] = { data: [], error: null }

    await getPublishedCourses()

    expect(capturedEqCalls).toEqual(
      expect.arrayContaining([{ column: "status", value: "published" }])
    )
  })

  it("returns an empty array when no published courses exist", async () => {
    mockData["courses"] = { data: [], error: null }
    mockData["course_lesson_counts"] = { data: [], error: null }
    const result = await getPublishedCourses()
    expect(result).toEqual([])
  })

  it("returns an empty array on DB error", async () => {
    mockData["courses"] = {
      data: null,
      error: { message: "connection refused" },
    }
    const result = await getPublishedCourses()
    expect(result).toEqual([])
  })

  it("maps course rows to CourseSummary DTOs", async () => {
    mockData["courses"] = { data: [fakeCourse()], error: null }
    mockData["course_lesson_counts"] = {
      data: [
        { course_id: "course-id-1", lesson_count: 5, total_duration_seconds: 1500 },
      ],
      error: null,
    }

    const result = await getPublishedCourses()
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      id: "course-id-1",
      slug: "test-course",
      lessonCount: 5,
      totalDurationSeconds: 1500,
    })
    // created_by must not be exposed in the DTO.
    expect(result[0]).not.toHaveProperty("created_by")
  })
})

// ---------------------------------------------------------------------------
// getCourseDetailBySlug
// ---------------------------------------------------------------------------

describe("getCourseDetailBySlug", () => {
  it("orders lessons by sort_order ascending", async () => {
    const capturedOrderCalls: typeof orderCalls = []

    const { createClient } = await import("@/lib/supabase/server")
    vi.mocked(createClient).mockResolvedValueOnce({
      from: (table: string) => {
        const b = makeBuilder(table)
        if (table === "lessons") {
          const originalOrder = b.order.bind(b)
          b.order = (col, opts) => {
            capturedOrderCalls.push({ column: col, options: opts })
            return originalOrder(col, opts)
          }
        }
        return b as ReturnType<typeof makeBuilder>
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>)

    mockData["courses"] = { data: fakeCourse(), error: null }
    mockData["lessons"] = {
      data: [fakeLesson(2), fakeLesson(0), fakeLesson(1)],
      error: null,
    }

    await getCourseDetailBySlug("test-course")

    expect(capturedOrderCalls).toEqual(
      expect.arrayContaining([
        { column: "sort_order", options: { ascending: true } },
      ])
    )
  })

  it("returns null when the course is not found", async () => {
    mockData["courses"] = {
      data: null,
      error: { code: "PGRST116", message: "Row not found" },
    }

    const result = await getCourseDetailBySlug("nonexistent")
    expect(result).toBeNull()
  })

  it("returns null when the lesson query fails", async () => {
    mockData["courses"] = { data: fakeCourse(), error: null }
    mockData["lessons"] = {
      data: null,
      error: { message: "lessons error" },
    }

    const result = await getCourseDetailBySlug("test-course")
    expect(result).toBeNull()
  })

  it("returns a CourseDetail with ordered lessons", async () => {
    mockData["courses"] = { data: fakeCourse(), error: null }
    mockData["lessons"] = {
      data: [fakeLesson(0), fakeLesson(1), fakeLesson(2)],
      error: null,
    }

    const result = await getCourseDetailBySlug("test-course")
    expect(result).not.toBeNull()
    expect(result?.lessons).toHaveLength(3)
    // The DTO must not leak created_by.
    expect(result).not.toHaveProperty("created_by")
  })

  it("sets lessonCount from the length of the lessons array", async () => {
    mockData["courses"] = { data: fakeCourse(), error: null }
    mockData["lessons"] = {
      data: [fakeLesson(0), fakeLesson(1)],
      error: null,
    }

    const result = await getCourseDetailBySlug("test-course")
    expect(result?.lessonCount).toBe(2)
  })

  it("returns totalDurationSeconds summed from lesson rows", async () => {
    mockData["courses"] = { data: fakeCourse(), error: null }
    mockData["lessons"] = {
      data: [
        fakeLesson(0, { duration_seconds: 100 }),
        fakeLesson(1, { duration_seconds: 200 }),
      ],
      error: null,
    }

    const result = await getCourseDetailBySlug("test-course")
    expect(result?.totalDurationSeconds).toBe(300)
  })
})
