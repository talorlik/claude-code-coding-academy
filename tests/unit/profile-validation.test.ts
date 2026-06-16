import { describe, expect, it } from "vitest"

import {
  ALLOWED_AVATAR_MIME,
  MAX_AVATAR_BYTES,
  avatarSchema,
  contactSchema,
  emailSchema,
  localeSchema,
  passwordSchema,
} from "@/lib/validation/profile"

/**
 * Unit tests for the profile validation schemas. These are the authoritative
 * server-side checks; the HTML form attributes are progressive-enhancement only,
 * so each constraint is asserted here directly.
 */
describe("contactSchema", () => {
  it("accepts a name and phone", () => {
    const r = contactSchema.parse({ fullName: "Ada Lovelace", phone: "+1 555" })
    expect(r.fullName).toBe("Ada Lovelace")
    expect(r.phone).toBe("+1 555")
  })

  it("trims surrounding whitespace", () => {
    const r = contactSchema.parse({ fullName: "  Ada  ", phone: "  555  " })
    expect(r.fullName).toBe("Ada")
    expect(r.phone).toBe("555")
  })

  it("treats both fields as optional", () => {
    expect(contactSchema.safeParse({}).success).toBe(true)
  })

  it("rejects an over-length name", () => {
    expect(
      contactSchema.safeParse({ fullName: "x".repeat(121) }).success
    ).toBe(false)
  })

  it("rejects an over-length phone", () => {
    expect(contactSchema.safeParse({ phone: "9".repeat(41) }).success).toBe(
      false
    )
  })
})

describe("emailSchema", () => {
  it("lower-cases and trims a valid address", () => {
    const r = emailSchema.parse({ email: "  USER@Example.COM  " })
    expect(r.email).toBe("user@example.com")
  })

  it("rejects a malformed address", () => {
    expect(emailSchema.safeParse({ email: "not-an-email" }).success).toBe(false)
  })

  it("rejects an empty address", () => {
    expect(emailSchema.safeParse({ email: "" }).success).toBe(false)
  })
})

describe("passwordSchema", () => {
  it("accepts a matching pair at the minimum length", () => {
    const r = passwordSchema.safeParse({
      password: "12345678",
      confirmPassword: "12345678",
    })
    expect(r.success).toBe(true)
  })

  it("rejects a too-short password", () => {
    const r = passwordSchema.safeParse({
      password: "short",
      confirmPassword: "short",
    })
    expect(r.success).toBe(false)
  })

  it("rejects a mismatch and tags the confirm field", () => {
    const r = passwordSchema.safeParse({
      password: "12345678",
      confirmPassword: "different",
    })
    expect(r.success).toBe(false)
    if (!r.success) {
      const mismatch = r.error.issues.some((i) =>
        i.path.includes("confirmPassword")
      )
      expect(mismatch).toBe(true)
    }
  })

  it("rejects an over-length password", () => {
    const long = "a".repeat(1001)
    expect(
      passwordSchema.safeParse({ password: long, confirmPassword: long }).success
    ).toBe(false)
  })
})

describe("localeSchema", () => {
  it("accepts the two supported locales", () => {
    expect(localeSchema.parse({ locale: "en" }).locale).toBe("en")
    expect(localeSchema.parse({ locale: "he" }).locale).toBe("he")
  })

  it("rejects an unsupported locale", () => {
    expect(localeSchema.safeParse({ locale: "fr" }).success).toBe(false)
  })
})

describe("avatarSchema", () => {
  it("accepts every allowlisted MIME type within the size cap", () => {
    for (const type of ALLOWED_AVATAR_MIME) {
      expect(avatarSchema.safeParse({ type, size: 1024 }).success).toBe(true)
    }
  })

  it("rejects a non-image MIME type", () => {
    expect(
      avatarSchema.safeParse({ type: "application/pdf", size: 1024 }).success
    ).toBe(false)
  })

  it("rejects a file over the size cap", () => {
    expect(
      avatarSchema.safeParse({ type: "image/png", size: MAX_AVATAR_BYTES + 1 })
        .success
    ).toBe(false)
  })

  it("rejects a zero-byte file", () => {
    expect(avatarSchema.safeParse({ type: "image/png", size: 0 }).success).toBe(
      false
    )
  })
})
