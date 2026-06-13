/**
 * Integration tests for lib/auth/guards.ts
 *
 * Verifies that:
 * - getIsAdmin() returns true for instructors, false for students and anon.
 * - requireAdmin() delegates to requireInstructor() (same behavior).
 *
 * All Supabase and locale calls are mocked; no live DB connection needed.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

// ---------------------------------------------------------------------------
// Mock getCurrentUserRole to control role state
// ---------------------------------------------------------------------------

let mockUserId: string | null = null
let mockIsInstructor = false

vi.mock("@/lib/auth/roles", () => ({
  getCurrentUserRole: vi.fn().mockImplementation(() =>
    Promise.resolve({
      userId: mockUserId,
      isInstructor: mockIsInstructor,
    })
  ),
  isInstructor: vi.fn(),
}))

// Mock redirect so requireInstructor doesn't actually navigate.
const mockRedirect = vi.fn().mockImplementation(() => {
  throw new Error("REDIRECT")
})

vi.mock("next-intl/server", () => ({
  getLocale: vi.fn().mockResolvedValue("en"),
}))

vi.mock("@/i18n/navigation", () => ({
  redirect: mockRedirect,
}))

const { getIsAdmin, requireAdmin } = await import("@/lib/auth/guards")

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getIsAdmin", () => {
  beforeEach(() => {
    mockUserId = null
    mockIsInstructor = false
    vi.clearAllMocks()
  })

  it("returns true for an instructor", async () => {
    mockUserId = "instructor-uuid"
    mockIsInstructor = true
    const result = await getIsAdmin()
    expect(result).toBe(true)
  })

  it("returns false for a student", async () => {
    mockUserId = "student-uuid"
    mockIsInstructor = false
    const result = await getIsAdmin()
    expect(result).toBe(false)
  })

  it("returns false for an anonymous visitor", async () => {
    mockUserId = null
    mockIsInstructor = false
    const result = await getIsAdmin()
    expect(result).toBe(false)
  })
})

describe("requireAdmin", () => {
  beforeEach(() => {
    mockUserId = null
    mockIsInstructor = false
    vi.clearAllMocks()
  })

  it("returns user id when caller is an instructor", async () => {
    mockUserId = "instructor-uuid"
    mockIsInstructor = true
    const id = await requireAdmin()
    expect(id).toBe("instructor-uuid")
  })

  it("throws REDIRECT for a signed-out visitor", async () => {
    mockUserId = null
    mockIsInstructor = false
    await expect(requireAdmin()).rejects.toThrow("REDIRECT")
  })

  it("throws REDIRECT for a signed-in student", async () => {
    mockUserId = "student-uuid"
    mockIsInstructor = false
    await expect(requireAdmin()).rejects.toThrow("REDIRECT")
  })
})
