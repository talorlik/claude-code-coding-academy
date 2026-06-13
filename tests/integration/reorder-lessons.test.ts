/**
 * Integration tests for lib/admin/reorder-lessons.ts
 *
 * Mocks:
 * - @/lib/auth/guards (requireAdmin)
 * - @/lib/supabase/server
 * - next/cache
 *
 * Tested invariants:
 * - Rejects bad input (missing id field).
 * - Performs two-phase update (phase1 offset then phase2 final values).
 * - Returns ok(null) on success.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

let mockIsInstructor = true

vi.mock("@/lib/auth/guards", () => ({
  requireAdmin: vi.fn().mockImplementation(() => {
    if (!mockIsInstructor) throw new Error("REDIRECT")
    return Promise.resolve("instructor-uuid")
  }),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

// Track update calls to verify two-phase strategy.
const updateCalls: Array<{ sortOrder: number; id: string }> = []

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(() =>
    Promise.resolve({
      from: (_table: string) => ({
        update: (payload: Record<string, unknown>) => ({
          eq: (_col: string, id: string) => {
            updateCalls.push({ sortOrder: payload["sort_order"] as number, id })
            return Promise.resolve({ data: null, error: null })
          },
        }),
      }),
    })
  ),
}))

const { reorderLessons } = await import("@/lib/admin/reorder-lessons")

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("reorderLessons", () => {
  beforeEach(() => {
    mockIsInstructor = true
    updateCalls.length = 0
  })

  it("returns ok(null) on empty array", async () => {
    const result = await reorderLessons("course-uuid", [])
    expect(result.ok).toBe(true)
  })

  it("returns fail on invalid input (non-uuid id)", async () => {
    const result = await reorderLessons("course-uuid", [
      { id: "not-a-uuid", sortOrder: 0 },
    ])
    expect(result.ok).toBe(false)
  })

  it("returns fail on invalid input (negative sortOrder)", async () => {
    const result = await reorderLessons("course-uuid", [
      { id: "f8d8763d-03a4-4e9f-89cb-d285e743ca25", sortOrder: -1 },
    ])
    expect(result.ok).toBe(false)
  })

  it("performs two-phase update: offsets then finals", async () => {
    const PHASE1_OFFSET = 10_000
    const pairs = [
      { id: "f8d8763d-03a4-4e9f-89cb-d285e743ca25", sortOrder: 0 },
      { id: "e8a1df2a-5808-43f9-afa4-efb43b71ea86", sortOrder: 1 },
    ]

    const result = await reorderLessons("course-uuid", pairs)
    expect(result.ok).toBe(true)

    // First 2 calls should have offset values.
    expect(updateCalls[0].sortOrder).toBe(PHASE1_OFFSET + 0)
    expect(updateCalls[1].sortOrder).toBe(PHASE1_OFFSET + 1)

    // Second 2 calls should have final values.
    expect(updateCalls[2].sortOrder).toBe(0)
    expect(updateCalls[3].sortOrder).toBe(1)

    // Total of 4 update calls (2 per phase).
    expect(updateCalls).toHaveLength(4)
  })

  it("returns fail when caller is not an instructor", async () => {
    mockIsInstructor = false
    await expect(
      reorderLessons("course-uuid", [
        { id: "f8d8763d-03a4-4e9f-89cb-d285e743ca25", sortOrder: 0 },
      ])
    ).rejects.toThrow("REDIRECT")
  })
})
