/**
 * Integration tests for lib/admin/users-actions.ts (Batch 26).
 *
 * Verifies the FormData server actions map data-layer results to the correct
 * `?notice=`/`?error=` redirect codes and enforce the confirm step for
 * destructive actions. The data layer and next-intl `redirect` are mocked;
 * `redirect` is captured (it throws in production, so callers never fall
 * through) and the last href asserted.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

const UUID = "123e4567-e89b-12d3-a456-426614174000"

// Captured redirect target (href + locale) for the most recent call.
let lastRedirect: { href: string; locale: string } | null = null

vi.mock("next-intl/server", () => ({
  getLocale: vi.fn().mockResolvedValue("en"),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

// redirect throws to mimic next-intl's control-flow signal, so the action body
// never continues past it - matching production behavior.
vi.mock("@/i18n/navigation", () => ({
  redirect: vi.fn().mockImplementation((args: { href: string; locale: string }) => {
    lastRedirect = args
    throw new Error("REDIRECT")
  }),
}))

const inviteUser = vi.fn()
const setUserRole = vi.fn()
const setUserDisabled = vi.fn()
const deleteUser = vi.fn()

vi.mock("@/lib/admin/users", () => ({
  inviteUser: (...a: unknown[]) => inviteUser(...a),
  setUserRole: (...a: unknown[]) => setUserRole(...a),
  setUserDisabled: (...a: unknown[]) => setUserDisabled(...a),
  deleteUser: (...a: unknown[]) => deleteUser(...a),
}))

const {
  inviteUserAction,
  setUserRoleAction,
  setUserDisabledAction,
  deleteUserAction,
} = await import("@/lib/admin/users-actions")

/** Builds a FormData from a plain object. */
function fd(fields: Record<string, string>): FormData {
  const f = new FormData()
  for (const [k, v] of Object.entries(fields)) f.set(k, v)
  return f
}

/** Runs an action, swallowing the redirect throw, and returns the href. */
async function run(
  action: (f: FormData) => Promise<void>,
  fields: Record<string, string>
): Promise<string> {
  lastRedirect = null
  await expect(action(fd(fields))).rejects.toThrow("REDIRECT")
  return lastRedirect!.href
}

beforeEach(() => {
  vi.clearAllMocks()
  inviteUser.mockResolvedValue({ ok: true, data: null })
  setUserRole.mockResolvedValue({ ok: true, data: null })
  setUserDisabled.mockResolvedValue({ ok: true, data: null })
  deleteUser.mockResolvedValue({ ok: true, data: null })
})

describe("inviteUserAction", () => {
  it("redirects with inviteSent on success", async () => {
    const href = await run(inviteUserAction, {
      email: "new@example.com",
      role: "student",
    })
    expect(href).toContain("notice=inviteSent")
  })

  it("redirects with invalidEmail on a bad email (no data-layer call)", async () => {
    const href = await run(inviteUserAction, { email: "nope", role: "student" })
    expect(href).toContain("error=invalidEmail")
    expect(inviteUser).not.toHaveBeenCalled()
  })

  it("reflects the data-layer failure code", async () => {
    inviteUser.mockResolvedValue({ ok: false, message: "inviteFailed" })
    const href = await run(inviteUserAction, {
      email: "new@example.com",
      role: "student",
    })
    expect(href).toContain("error=inviteFailed")
  })
})

describe("setUserRoleAction", () => {
  it("redirects with roleChanged on success", async () => {
    const href = await run(setUserRoleAction, { userId: UUID, role: "instructor" })
    expect(href).toContain("notice=roleChanged")
  })

  it("reflects a guard refusal code (lastInstructor)", async () => {
    setUserRole.mockResolvedValue({ ok: false, message: "lastInstructor" })
    const href = await run(setUserRoleAction, { userId: UUID, role: "student" })
    expect(href).toContain("error=lastInstructor")
  })
})

describe("setUserDisabledAction", () => {
  it("requires confirmation before disabling (first submit bounces)", async () => {
    const href = await run(setUserDisabledAction, {
      userId: UUID,
      disabled: "true",
    })
    expect(href).toContain("confirm=disable")
    expect(setUserDisabled).not.toHaveBeenCalled()
  })

  it("disables when confirm=yes is present", async () => {
    const href = await run(setUserDisabledAction, {
      userId: UUID,
      disabled: "true",
      confirm: "yes",
    })
    expect(href).toContain("notice=userDisabled")
    expect(setUserDisabled).toHaveBeenCalledWith(UUID, true)
  })

  it("enables immediately without a confirm step", async () => {
    const href = await run(setUserDisabledAction, {
      userId: UUID,
      disabled: "false",
    })
    expect(href).toContain("notice=userEnabled")
    expect(setUserDisabled).toHaveBeenCalledWith(UUID, false)
  })
})

describe("deleteUserAction", () => {
  it("requires confirmation before deleting (first submit bounces)", async () => {
    const href = await run(deleteUserAction, { userId: UUID })
    expect(href).toContain("confirm=delete")
    expect(deleteUser).not.toHaveBeenCalled()
  })

  it("deletes and redirects to the list on confirmed success", async () => {
    const href = await run(deleteUserAction, { userId: UUID, confirm: "yes" })
    expect(href).toContain("notice=userDeleted")
    expect(deleteUser).toHaveBeenCalledWith(UUID)
  })

  it("reflects a guard refusal back to the detail page", async () => {
    deleteUser.mockResolvedValue({ ok: false, message: "cannotSelf" })
    const href = await run(deleteUserAction, { userId: UUID, confirm: "yes" })
    expect(href).toContain("error=cannotSelf")
    expect(href).toContain(UUID)
  })
})
