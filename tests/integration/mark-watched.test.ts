/**
 * Integration tests for lib/progress/actions.ts - markLessonWatched.
 *
 * All Supabase client calls are mocked via vi.mock; no live DB connection is
 * needed. The chainable builder pattern mirrors the approach in
 * enroll-action.test.ts.
 *
 * Tested invariants:
 * - Returns fail("signInRequired") when unauthenticated.
 * - Returns fail("notEnrolled") when user has no enrollment row.
 * - Returns ok(MarkWatchedResult) on success with correct nextLessonId.
 * - Sets courseCompleted = true when the last lesson is marked watched.
 * - Re-marking an already-watched lesson is idempotent (ok, no crash).
 */

import { beforeEach, describe, expect, it, vi } from "vitest"
import type { createClient as SupabaseCreateClient } from "@/lib/supabase/server"

// ---------------------------------------------------------------------------
// Builder stub for Supabase chainable queries
// ---------------------------------------------------------------------------

type MockResult = {
  data: unknown
  error: null | { message: string; code?: string }
}

const mockTableResults: Record<string, MockResult> = {}

function makeQueryBuilder(table: string) {
  const self = {
    select: () => self,
    eq: () => self,
    order: () => self,
    maybeSingle: () =>
      Promise.resolve(
        mockTableResults[`${table}:maybeSingle`] ?? { data: null, error: null }
      ),
    upsert: () =>
      Promise.resolve(
        mockTableResults[`${table}:upsert`] ?? { data: null, error: null }
      ),
    update: (_payload?: unknown) => ({
      eq: () =>
        Promise.resolve(
          mockTableResults[`${table}:update`] ?? { data: null, error: null }
        ),
    }),
    // Resolves as the "direct await" path (used for lesson_progress select etc).
    then: (
      resolve: (v: MockResult) => unknown,
      reject?: (e: unknown) => unknown
    ) => {
      const result = mockTableResults[table] ?? { data: null, error: null }
      return Promise.resolve(result).then(resolve, reject)
    },
  }
  return self
}

// ---------------------------------------------------------------------------
// Mock auth state
// ---------------------------------------------------------------------------

let mockAuthUser: { id: string; email: string } | null = null

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockImplementation(() =>
        Promise.resolve({ data: { user: mockAuthUser } })
      ),
    },
    from: (table: string) => makeQueryBuilder(table),
  }),
}))

// Import AFTER mocks. Top-level await is valid in ESM (target esnext).
const { markLessonWatched } = await import("@/lib/progress/actions")

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const VALID_COURSE_ID = "550e8400-e29b-41d4-a716-446655440000"
const VALID_LESSON_ID = "6ba7b810-9dad-41d1-80b4-00c04fd430c8"
const VALID_LESSON_ID_2 = "6ba7b810-9dad-41d1-80b4-00c04fd430c9"
const VALID_USER_ID = "123e4567-e89b-41d4-a456-426614174000"

function setAuthUser(user: typeof mockAuthUser) {
  mockAuthUser = user
}

function setEnrollmentResult(
  enrollment: { id: string; completed_at: string | null } | null
) {
  if (enrollment) {
    mockTableResults["enrollments:maybeSingle"] = {
      data: enrollment,
      error: null,
    }
  } else {
    mockTableResults["enrollments:maybeSingle"] = { data: null, error: null }
  }
}

function setLessonCheckResult(
  lesson: { id: string; course_id: string; sort_order: number } | null
) {
  if (lesson) {
    mockTableResults["lessons:maybeSingle"] = { data: lesson, error: null }
  } else {
    mockTableResults["lessons:maybeSingle"] = { data: null, error: null }
  }
}

function setAllLessonsResult(
  lessons: Array<{ id: string; sort_order: number }>
) {
  mockTableResults["lessons"] = { data: lessons, error: null }
}

function setProgressRowsResult(
  rows: Array<{ lesson_id: string; watched_at: string }>
) {
  mockTableResults["lesson_progress"] = { data: rows, error: null }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("markLessonWatched", () => {
  beforeEach(async () => {
    mockAuthUser = null
    Object.keys(mockTableResults).forEach((k) => delete mockTableResults[k])

    // Restore default createClient mock.
    const { createClient } = await import("@/lib/supabase/server")
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockImplementation(() =>
          Promise.resolve({ data: { user: mockAuthUser } })
        ),
      },
      from: (table: string) => makeQueryBuilder(table),
    } as unknown as Awaited<ReturnType<typeof SupabaseCreateClient>>)
  })

  it("returns fail(signInRequired) when unauthenticated", async () => {
    setAuthUser(null)
    const result = await markLessonWatched({
      courseId: VALID_COURSE_ID,
      lessonId: VALID_LESSON_ID,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toBe("signInRequired")
    }
  })

  it("returns fail with fieldErrors on invalid input", async () => {
    setAuthUser({ id: VALID_USER_ID, email: "test@example.com" })
    const result = await markLessonWatched({
      courseId: "not-a-uuid",
      lessonId: VALID_LESSON_ID,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.fieldErrors).toBeDefined()
    }
  })

  it("returns fail(notEnrolled) when user has no enrollment", async () => {
    setAuthUser({ id: VALID_USER_ID, email: "test@example.com" })
    setEnrollmentResult(null)

    const result = await markLessonWatched({
      courseId: VALID_COURSE_ID,
      lessonId: VALID_LESSON_ID,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toBe("notEnrolled")
    }
  })

  it("returns ok and nextLessonId on success with more lessons remaining", async () => {
    setAuthUser({ id: VALID_USER_ID, email: "test@example.com" })
    setEnrollmentResult({ id: "enroll-1", completed_at: null })
    setLessonCheckResult({
      id: VALID_LESSON_ID,
      course_id: VALID_COURSE_ID,
      sort_order: 0,
    })
    setAllLessonsResult([
      { id: VALID_LESSON_ID, sort_order: 0 },
      { id: VALID_LESSON_ID_2, sort_order: 1 },
    ])
    // After marking lesson 1, progress rows include it.
    setProgressRowsResult([
      { lesson_id: VALID_LESSON_ID, watched_at: new Date().toISOString() },
    ])

    const result = await markLessonWatched({
      courseId: VALID_COURSE_ID,
      lessonId: VALID_LESSON_ID,
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.nextLessonId).toBe(VALID_LESSON_ID_2)
      expect(result.data.courseCompleted).toBe(false)
      expect(result.data.progress.completedLessons).toBe(1)
    }
  })

  it("sets courseCompleted true when the final lesson is marked watched", async () => {
    setAuthUser({ id: VALID_USER_ID, email: "test@example.com" })
    setEnrollmentResult({ id: "enroll-1", completed_at: null })
    setLessonCheckResult({
      id: VALID_LESSON_ID,
      course_id: VALID_COURSE_ID,
      sort_order: 0,
    })
    setAllLessonsResult([{ id: VALID_LESSON_ID, sort_order: 0 }])
    // Both lessons now complete.
    setProgressRowsResult([
      { lesson_id: VALID_LESSON_ID, watched_at: new Date().toISOString() },
    ])

    const result = await markLessonWatched({
      courseId: VALID_COURSE_ID,
      lessonId: VALID_LESSON_ID,
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.courseCompleted).toBe(true)
      expect(result.data.nextLessonId).toBeNull()
      expect(result.data.progress.isComplete).toBe(true)
    }
  })

  it("is idempotent: re-marking returns ok without error", async () => {
    setAuthUser({ id: VALID_USER_ID, email: "test@example.com" })
    setEnrollmentResult({ id: "enroll-1", completed_at: new Date().toISOString() })
    setLessonCheckResult({
      id: VALID_LESSON_ID,
      course_id: VALID_COURSE_ID,
      sort_order: 0,
    })
    setAllLessonsResult([{ id: VALID_LESSON_ID, sort_order: 0 }])
    setProgressRowsResult([
      { lesson_id: VALID_LESSON_ID, watched_at: new Date().toISOString() },
    ])

    const result = await markLessonWatched({
      courseId: VALID_COURSE_ID,
      lessonId: VALID_LESSON_ID,
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      // Already completed_at was set, so courseCompleted stays true.
      expect(result.data.courseCompleted).toBe(true)
    }
  })

  it("updates last_accessed_lesson_id on success", async () => {
    const updateCalls: string[] = []
    setAuthUser({ id: VALID_USER_ID, email: "test@example.com" })
    setEnrollmentResult({ id: "enroll-1", completed_at: null })
    setLessonCheckResult({
      id: VALID_LESSON_ID,
      course_id: VALID_COURSE_ID,
      sort_order: 0,
    })
    setAllLessonsResult([{ id: VALID_LESSON_ID, sort_order: 0 }])
    setProgressRowsResult([
      { lesson_id: VALID_LESSON_ID, watched_at: new Date().toISOString() },
    ])

    // Intercept update calls to track last_accessed_lesson_id update.
    const { createClient } = await import("@/lib/supabase/server")
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: VALID_USER_ID } },
        }),
      },
      from: (table: string) => {
        const b = makeQueryBuilder(table)
        if (table === "enrollments") {
          const originalUpdate = b.update.bind(b)
          b.update = (payload?: unknown) => {
            const p = payload as Record<string, unknown> | undefined
            if (p && "last_accessed_lesson_id" in p) {
              updateCalls.push(p.last_accessed_lesson_id as string)
            }
            return originalUpdate(p)
          }
        }
        return b
      },
    } as unknown as Awaited<ReturnType<typeof SupabaseCreateClient>>)

    await markLessonWatched({
      courseId: VALID_COURSE_ID,
      lessonId: VALID_LESSON_ID,
    })

    expect(updateCalls).toContain(VALID_LESSON_ID)
  })
})
