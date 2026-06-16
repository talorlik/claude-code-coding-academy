/**
 * Unit tests for the admin user-management validation schemas and the
 * notice/error message resolver (Batch 26).
 */

import { describe, expect, it } from "vitest"

import {
  disableSchema,
  inviteSchema,
  roleChangeSchema,
} from "@/lib/validation/admin-users"
import {
  ADMIN_USERS_MESSAGE_CODES,
  isAdminUsersMessageCode,
  resolveAdminUsersMessage,
} from "@/lib/admin/resolve-users-message"

const UUID = "123e4567-e89b-12d3-a456-426614174000"

describe("inviteSchema", () => {
  it("accepts a valid email and role, normalizing case", () => {
    const parsed = inviteSchema.safeParse({
      email: "  New@Example.COM ",
      role: "instructor",
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.email).toBe("new@example.com")
  })

  it("rejects a malformed email", () => {
    expect(inviteSchema.safeParse({ email: "nope", role: "student" }).success).toBe(
      false
    )
  })

  it("rejects an unknown role", () => {
    expect(
      inviteSchema.safeParse({ email: "a@b.com", role: "admin" }).success
    ).toBe(false)
  })
})

describe("roleChangeSchema", () => {
  it("accepts a uuid + valid role", () => {
    expect(
      roleChangeSchema.safeParse({ userId: UUID, role: "student" }).success
    ).toBe(true)
  })
  it("rejects a non-uuid id", () => {
    expect(
      roleChangeSchema.safeParse({ userId: "x", role: "student" }).success
    ).toBe(false)
  })
})

describe("disableSchema", () => {
  it("accepts a uuid + boolean", () => {
    expect(
      disableSchema.safeParse({ userId: UUID, disabled: true }).success
    ).toBe(true)
  })
  it("rejects a non-boolean disabled", () => {
    expect(
      disableSchema.safeParse({ userId: UUID, disabled: "yes" }).success
    ).toBe(false)
  })
})

describe("resolveAdminUsersMessage", () => {
  const translate = (key: string) => `T:${key}`

  it("resolves every allowlisted code", () => {
    for (const code of ADMIN_USERS_MESSAGE_CODES) {
      expect(
        resolveAdminUsersMessage(translate as never, code)
      ).toBe(`T:${code}`)
    }
  })

  it("returns null for an unknown or forged code (anti-injection)", () => {
    expect(resolveAdminUsersMessage(translate as never, "<script>")).toBeNull()
    expect(resolveAdminUsersMessage(translate as never, undefined)).toBeNull()
  })

  it("narrows codes with isAdminUsersMessageCode", () => {
    expect(isAdminUsersMessageCode("roleChanged")).toBe(true)
    expect(isAdminUsersMessageCode("totally-fake")).toBe(false)
  })
})
