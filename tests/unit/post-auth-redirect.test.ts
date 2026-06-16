/**
 * Unit tests for lib/auth/post-auth-redirect.ts.
 *
 * The role lookup ({@link isInstructor}) is mocked; no live DB required. The
 * resolver must branch purely on role: instructors to /admin/dashboard, all
 * other accounts to /dashboard. `?redirect=` precedence lives in the callers and
 * is intentionally NOT exercised here.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

const isInstructorMock = vi.fn<(userId: string | null | undefined) => Promise<boolean>>()

vi.mock("@/lib/auth/roles", () => ({
  isInstructor: (userId: string | null | undefined) => isInstructorMock(userId),
}))

const { resolvePostAuthDestination } = await import(
  "@/lib/auth/post-auth-redirect"
)

beforeEach(() => {
  isInstructorMock.mockReset()
})

describe("resolvePostAuthDestination", () => {
  it("routes an instructor to /admin/dashboard", async () => {
    isInstructorMock.mockResolvedValue(true)
    await expect(resolvePostAuthDestination("instructor-uuid")).resolves.toBe(
      "/admin/dashboard"
    )
    expect(isInstructorMock).toHaveBeenCalledWith("instructor-uuid")
  })

  it("routes a student to /dashboard", async () => {
    isInstructorMock.mockResolvedValue(false)
    await expect(resolvePostAuthDestination("student-uuid")).resolves.toBe(
      "/dashboard"
    )
    expect(isInstructorMock).toHaveBeenCalledWith("student-uuid")
  })
})
