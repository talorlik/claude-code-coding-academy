import { describe, expect, it } from "vitest"

import {
  PROFILE_MESSAGE_CODES,
  isProfileMessageCode,
  resolveProfileMessage,
} from "@/lib/profile/resolve-profile-message"

/**
 * Unit tests for the profile message allowlist resolver. Mirrors the auth/
 * contact resolver contract: only allowlisted codes resolve to text, so a
 * forged query param can never reflect arbitrary content into the page.
 */
describe("isProfileMessageCode", () => {
  it("accepts every allowlisted code", () => {
    for (const code of PROFILE_MESSAGE_CODES) {
      expect(isProfileMessageCode(code)).toBe(true)
    }
  })

  it("rejects an unknown code", () => {
    expect(isProfileMessageCode("totallyMadeUp")).toBe(false)
  })

  it("rejects an injection attempt", () => {
    expect(isProfileMessageCode("<script>alert(1)</script>")).toBe(false)
  })

  it("rejects undefined", () => {
    expect(isProfileMessageCode(undefined)).toBe(false)
  })
})

describe("resolveProfileMessage", () => {
  const translate = (key: string) => `t:${key}`

  it("resolves a known code through the translator", () => {
    expect(resolveProfileMessage(translate, "detailsSaved")).toBe(
      "t:detailsSaved"
    )
  })

  it("returns null for an unknown or forged code", () => {
    expect(resolveProfileMessage(translate, "nope")).toBeNull()
    expect(resolveProfileMessage(translate, "<script>")).toBeNull()
  })

  it("returns null for an absent code", () => {
    expect(resolveProfileMessage(translate, undefined)).toBeNull()
  })
})
