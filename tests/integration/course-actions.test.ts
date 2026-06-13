/**
 * Integration tests for lib/admin/course-actions.ts
 *
 * Mocks:
 * - @/lib/supabase/server (createClient chain)
 * - @/lib/auth/guards (requireAdmin)
 * - next/cache (revalidatePath)
 *
 * Tested invariants:
 * - createCourse: validates + inserts; duplicate slug (23505) -> fail with fieldErrors.
 * - deleteCourse: deletes + revalidates.
 * - Non-instructor: requireAdmin redirects (throws "REDIRECT").
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

// ---------------------------------------------------------------------------
// Mock state - shared between mock factory and tests
// ---------------------------------------------------------------------------

let mockIsInstructor = true

let mockInsertResult: {
  data: unknown
  error: null | { message: string; code?: string }
} = { data: null, error: null }

let mockDeleteResult: {
  data: unknown
  error: null | { message: string; code?: string }
} = { data: null, error: null }

let mockSelectSingleResult: {
  data: unknown
  error: null | { message: string; code?: string }
} = { data: null, error: null }

vi.mock("@/lib/auth/guards", () => ({
  requireAdmin: vi.fn().mockImplementation(() => {
    if (!mockIsInstructor) throw new Error("REDIRECT")
    return Promise.resolve("instructor-uuid")
  }),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(() =>
    Promise.resolve({
      from: (_table: string) => ({
        select: (_cols?: string) => ({
          eq: () => ({
            single: () => Promise.resolve(mockSelectSingleResult),
          }),
        }),
        insert: (_row: unknown) => ({
          select: (_cols?: string) => ({
            single: () => Promise.resolve(mockInsertResult),
          }),
        }),
        update: (_payload: unknown) => ({
          eq: () => ({
            select: (_cols?: string) => ({
              single: () => Promise.resolve(mockInsertResult),
            }),
          }),
        }),
        delete: () => ({
          eq: () => Promise.resolve(mockDeleteResult),
        }),
      }),
    })
  ),
}))

// Import AFTER mocks so hoisting applies.
const { createCourse, deleteCourse } = await import(
  "@/lib/admin/course-actions"
)

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createCourse", () => {
  beforeEach(() => {
    mockIsInstructor = true
    mockInsertResult = { data: null, error: null }
    mockDeleteResult = { data: null, error: null }
    mockSelectSingleResult = { data: null, error: null }
  })

  it("returns fail on invalid input (missing title)", async () => {
    const result = await createCourse({
      slug: "test",
      description: "desc",
      level: "beginner",
      status: "draft",
      language: "en",
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.fieldErrors?.title).toBeTruthy()
    }
  })

  it("returns ok on valid input", async () => {
    mockInsertResult = {
      data: { id: "course-uuid", slug: "test-course" },
      error: null,
    }

    const result = await createCourse({
      slug: "test-course",
      title: "Test Course",
      description: "A description",
      level: "beginner",
      status: "draft",
      language: "en",
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.slug).toBe("test-course")
    }
  })

  it("returns fail with slug fieldError on duplicate slug (23505)", async () => {
    mockInsertResult = {
      data: null,
      error: { message: "duplicate key", code: "23505" },
    }

    const result = await createCourse({
      slug: "existing-slug",
      title: "Test Course",
      description: "A description",
      level: "beginner",
      status: "draft",
      language: "en",
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.fieldErrors?.slug).toBeTruthy()
    }
  })

  it("returns fail when caller is not an instructor", async () => {
    mockIsInstructor = false
    await expect(
      createCourse({
        slug: "test",
        title: "Test",
        description: "desc",
        level: "beginner",
        status: "draft",
        language: "en",
      })
    ).rejects.toThrow("REDIRECT")
  })
})

describe("deleteCourse", () => {
  beforeEach(() => {
    mockIsInstructor = true
    mockSelectSingleResult = { data: { slug: "test-course" }, error: null }
    mockDeleteResult = { data: null, error: null }
  })

  it("returns ok on successful delete", async () => {
    const result = await deleteCourse("course-uuid")
    expect(result.ok).toBe(true)
  })

  it("returns fail on DB error", async () => {
    mockDeleteResult = {
      data: null,
      error: { message: "db error", code: "500" },
    }

    const result = await deleteCourse("course-uuid")
    expect(result.ok).toBe(false)
  })
})
