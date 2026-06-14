import { describe, expect, it, vi, beforeEach } from "vitest"

import { submitContactMessage } from "@/lib/contact/actions"
import {
  resolveContactMessage,
  isContactMessageCode,
} from "@/lib/contact/resolve-contact-message"

// Capture the redirect target instead of throwing/navigating. The i18n redirect
// is replaced with a spy that records the href the action chose.
const redirect = vi.fn()
vi.mock("@/i18n/navigation", () => ({
  redirect: (args: { href: string; locale: string }) => redirect(args),
}))

vi.mock("next-intl/server", () => ({
  getLocale: vi.fn().mockResolvedValue("en"),
}))

/** Builds a FormData with the given contact fields. */
function form(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

beforeEach(() => {
  redirect.mockClear()
})

describe("submitContactMessage", () => {
  it("redirects with notice=messageSent on a valid submission", async () => {
    await submitContactMessage(
      form({
        name: "Test User",
        email: "test@example.com",
        message: "I have a question about the JavaScript course, thanks.",
      })
    )
    expect(redirect).toHaveBeenCalledWith({
      href: "/contact?notice=messageSent",
      locale: "en",
    })
  })

  it("maps a missing name to error=nameRequired", async () => {
    await submitContactMessage(
      form({ name: "", email: "test@example.com", message: "long enough message" })
    )
    expect(redirect).toHaveBeenCalledWith({
      href: "/contact?error=nameRequired",
      locale: "en",
    })
  })

  it("maps an invalid email to error=invalidEmail", async () => {
    await submitContactMessage(
      form({ name: "Test User", email: "not-an-email", message: "long enough message" })
    )
    expect(redirect).toHaveBeenCalledWith({
      href: "/contact?error=invalidEmail",
      locale: "en",
    })
  })

  it("maps a too-short message to error=messageTooShort", async () => {
    await submitContactMessage(
      form({ name: "Test User", email: "test@example.com", message: "hi" })
    )
    expect(redirect).toHaveBeenCalledWith({
      href: "/contact?error=messageTooShort",
      locale: "en",
    })
  })

  it("maps an over-length message to error=messageTooLong", async () => {
    await submitContactMessage(
      form({
        name: "Test User",
        email: "test@example.com",
        message: "x".repeat(2001),
      })
    )
    expect(redirect).toHaveBeenCalledWith({
      href: "/contact?error=messageTooLong",
      locale: "en",
    })
  })

  it("never reflects a raw error string into the redirect (codes only)", async () => {
    await submitContactMessage(
      form({ name: "", email: "test@example.com", message: "hi" })
    )
    const href = redirect.mock.calls[0]?.[0]?.href as string
    // Only the first field error wins (name), and it is an allowlisted code.
    const code = href.split("error=")[1]
    expect(isContactMessageCode(code)).toBe(true)
  })
})

describe("resolveContactMessage", () => {
  const translate = (key: string) => `t:${key}`

  it("resolves a known code through the allowlist", () => {
    expect(resolveContactMessage(translate, "messageSent")).toBe("t:messageSent")
  })

  it("returns null for an unknown or forged code", () => {
    expect(resolveContactMessage(translate, "<script>")).toBeNull()
    expect(resolveContactMessage(translate, undefined)).toBeNull()
  })
})
