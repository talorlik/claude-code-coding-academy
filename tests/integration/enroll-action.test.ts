/**
 * Integration tests for lib/courses/actions.ts - enrollInCourse.
 *
 * All Supabase client calls are mocked via vi.mock; no live DB connection
 * is needed. The chainable builder pattern mirrors the approach used in
 * courses-queries.test.ts.
 *
 * Tested invariants:
 * - Returns fail("signInRequired") when the user is not authenticated.
 * - Returns fail with fieldErrors on invalid input (bad UUID).
 * - Returns ok(EnrollResult) with targetLessonId on successful enrollment.
 * - Is idempotent: returns ok even when the enrollment already exists.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"
import type { createClient as SupabaseCreateClient } from "@/lib/supabase/server"

// ---------------------------------------------------------------------------
// Builder stub for Supabase chainable queries
// ---------------------------------------------------------------------------

type MockResult = { data: unknown; error: null | { message: string; code?: string } }

const mockTableResults: Record<string, MockResult> = {}

function makeQueryBuilder(table: string) {
  const builder: Record<string, (...args: unknown[]) => unknown> = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    limit: () => builder,
    single: () =>
      Promise.resolve(mockTableResults[table] ?? { data: null, error: null }),
    maybeSingle: () =>
      Promise.resolve(
        mockTableResults[`${table}:maybeSingle`] ?? { data: null, error: null }
      ),
    upsert: () =>
      Promise.resolve(
        mockTableResults[`${table}:upsert`] ?? { data: null, error: null }
      ),
  }

  return builder
}

// ---------------------------------------------------------------------------
// Mock auth state
// ---------------------------------------------------------------------------

let mockAuthUser: { id: string; email: string } | null = null

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

// lib/courses/actions.ts now imports the locale-aware redirect from
// @/i18n/navigation (added for submitReview in batch 19). Mock it so importing
// the actions module does not pull in next-intl -> next/navigation, which does
// not resolve under the Vitest jsdom environment. enrollInCourse never calls
// redirect, so a no-op stub is sufficient here.
vi.mock("@/i18n/navigation", () => ({
  redirect: vi.fn(),
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

// Import AFTER mocks. Top-level await is valid in ESM modules (target esnext).
const { enrollInCourse } = await import("@/lib/courses/actions")

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

// Use proper v4 UUIDs - Zod v4 validates the version nibble strictly.
const VALID_COURSE_ID = "550e8400-e29b-41d4-a716-446655440000"
const VALID_USER_ID = "6ba7b810-9dad-41d1-80b4-00c04fd430c8"

function setAuthUser(user: typeof mockAuthUser) {
  mockAuthUser = user
}

function setCourseResult(course: unknown | null) {
  mockTableResults["courses"] = {
    data: course,
    error: course ? null : { message: "Row not found", code: "PGRST116" },
  }
}

function setUpsertResult(error: null | { message: string }) {
  mockTableResults["enrollments:upsert"] = { data: null, error }
}

function setLessonResult(lesson: { id: string } | null) {
  mockTableResults["lessons:maybeSingle"] = { data: lesson, error: null }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("enrollInCourse", () => {
  beforeEach(async () => {
    // Reset data state between tests but do NOT clear the createClient mock
    // implementation (vi.clearAllMocks would wipe the resolved value).
    mockAuthUser = null
    Object.keys(mockTableResults).forEach((k) => delete mockTableResults[k])
    // Restore the default createClient mock after any mockResolvedValueOnce
    // overrides from a previous test.
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

  it("returns fail('signInRequired') when user is not authenticated", async () => {
    setAuthUser(null)
    const result = await enrollInCourse({ courseId: VALID_COURSE_ID })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toBe("signInRequired")
    }
  })

  it("returns fail with fieldErrors on invalid courseId", async () => {
    setAuthUser({ id: VALID_USER_ID, email: "user@test.com" })
    const result = await enrollInCourse({ courseId: "not-a-uuid" })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.fieldErrors).toBeDefined()
      expect(result.fieldErrors?.courseId).toMatch(/uuid/i)
    }
  })

  it("returns fail('courseNotFound') when course does not exist", async () => {
    setAuthUser({ id: VALID_USER_ID, email: "user@test.com" })
    setCourseResult(null)
    const result = await enrollInCourse({ courseId: VALID_COURSE_ID })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toBe("courseNotFound")
    }
  })

  it("returns ok with targetLessonId on successful enrollment", async () => {
    setAuthUser({ id: VALID_USER_ID, email: "user@test.com" })
    setCourseResult({ id: VALID_COURSE_ID, slug: "intro-js" })
    setUpsertResult(null)
    setLessonResult({ id: "lesson-uuid-001" })

    const result = await enrollInCourse({ courseId: VALID_COURSE_ID })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.courseId).toBe(VALID_COURSE_ID)
      expect(result.data.slug).toBe("intro-js")
      expect(result.data.targetLessonId).toBe("lesson-uuid-001")
    }
  })

  it("is idempotent: returns ok when enrollment already exists (upsert no-op)", async () => {
    setAuthUser({ id: VALID_USER_ID, email: "user@test.com" })
    setCourseResult({ id: VALID_COURSE_ID, slug: "intro-js" })
    // ignoreDuplicates means no error on conflict.
    setUpsertResult(null)
    setLessonResult(null)

    const result = await enrollInCourse({ courseId: VALID_COURSE_ID })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.targetLessonId).toBeNull()
    }
  })

  it("returns fail on DB insert error", async () => {
    setAuthUser({ id: VALID_USER_ID, email: "user@test.com" })
    setCourseResult({ id: VALID_COURSE_ID, slug: "intro-js" })
    setUpsertResult({ message: "connection error" })

    const result = await enrollInCourse({ courseId: VALID_COURSE_ID })
    expect(result.ok).toBe(false)
  })
})
