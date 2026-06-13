/**
 * Integration tests for lib/email/transport.ts
 *
 * nodemailer is fully mocked - no SMTP connection is established.
 * vi.stubEnv controls SMTP_* variables per test.
 *
 * Tested invariants:
 * - Port 465 -> secure:true passed to createTransport.
 * - Port 587 -> secure:false passed to createTransport.
 * - Missing SMTP_HOST/USER/PASSWORD -> sendEmail returns fail (no throw).
 * - Spaces in SMTP_PASSWORD are stripped before passing to createTransport.
 * - A sendMail rejection returns fail with a SAFE message (no password leakage).
 * - From address defaults to SMTP_USER; uses EMAIL_FROM when set.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// ---------------------------------------------------------------------------
// nodemailer mock
// ---------------------------------------------------------------------------

const mockSendMail = vi.fn()

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn().mockReturnValue({
      sendMail: mockSendMail,
    }),
  },
}))

// server-only is a Next.js package that throws in non-RSC environments.
vi.mock("server-only", () => ({}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const REQUIRED_ENV = {
  SMTP_HOST: "smtp.gmail.com",
  SMTP_USER: "test@gmail.com",
  SMTP_PASSWORD: "abcd efgh ijkl mnop",
}

const EMAIL_PAYLOAD = {
  to: "student@example.com",
  subject: "Test subject",
  text: "Hello",
  html: "<p>Hello</p>",
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("getTransport - port / TLS selection", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it("returns secure:true for port 465", async () => {
    vi.stubEnv("SMTP_HOST", "smtp.gmail.com")
    vi.stubEnv("SMTP_PORT", "465")
    vi.stubEnv("SMTP_USER", "test@gmail.com")
    vi.stubEnv("SMTP_PASSWORD", "testpassword")

    const nodemailer = await import("nodemailer")
    const { getTransport } = await import("@/lib/email/transport")

    getTransport()

    expect(nodemailer.default.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ port: 465, secure: true })
    )
  })

  it("returns secure:false for port 587 (STARTTLS)", async () => {
    vi.stubEnv("SMTP_HOST", "smtp.gmail.com")
    vi.stubEnv("SMTP_PORT", "587")
    vi.stubEnv("SMTP_USER", "test@gmail.com")
    vi.stubEnv("SMTP_PASSWORD", "testpassword")

    const nodemailer = await import("nodemailer")
    const { getTransport } = await import("@/lib/email/transport")

    getTransport()

    expect(nodemailer.default.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ port: 587, secure: false })
    )
  })

  it("strips spaces from SMTP_PASSWORD", async () => {
    vi.stubEnv("SMTP_HOST", "smtp.gmail.com")
    vi.stubEnv("SMTP_PORT", "465")
    vi.stubEnv("SMTP_USER", "test@gmail.com")
    vi.stubEnv("SMTP_PASSWORD", "abcd efgh ijkl mnop")

    const nodemailer = await import("nodemailer")
    const { getTransport } = await import("@/lib/email/transport")

    getTransport()

    expect(nodemailer.default.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        auth: expect.objectContaining({ pass: "abcdefghijklmnop" }),
      })
    )
  })
})

describe("sendEmail - missing env vars", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it("returns fail when SMTP_HOST is missing", async () => {
    vi.stubEnv("SMTP_HOST", "")
    vi.stubEnv("SMTP_USER", "test@gmail.com")
    vi.stubEnv("SMTP_PASSWORD", "testpassword")

    const { sendEmail } = await import("@/lib/email/transport")
    const result = await sendEmail(EMAIL_PAYLOAD)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toContain("not configured")
    }
  })

  it("returns fail when SMTP_USER is missing", async () => {
    vi.stubEnv("SMTP_HOST", "smtp.gmail.com")
    vi.stubEnv("SMTP_USER", "")
    vi.stubEnv("SMTP_PASSWORD", "testpassword")

    const { sendEmail } = await import("@/lib/email/transport")
    const result = await sendEmail(EMAIL_PAYLOAD)

    expect(result.ok).toBe(false)
  })

  it("returns fail when SMTP_PASSWORD is missing", async () => {
    vi.stubEnv("SMTP_HOST", "smtp.gmail.com")
    vi.stubEnv("SMTP_USER", "test@gmail.com")
    vi.stubEnv("SMTP_PASSWORD", "")

    const { sendEmail } = await import("@/lib/email/transport")
    const result = await sendEmail(EMAIL_PAYLOAD)

    expect(result.ok).toBe(false)
  })
})

describe("sendEmail - sendMail behavior", () => {
  beforeEach(() => {
    vi.stubEnv("SMTP_HOST", REQUIRED_ENV.SMTP_HOST)
    vi.stubEnv("SMTP_USER", REQUIRED_ENV.SMTP_USER)
    vi.stubEnv("SMTP_PASSWORD", REQUIRED_ENV.SMTP_PASSWORD)
    vi.stubEnv("SMTP_PORT", "465")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("returns ok with messageId on success", async () => {
    mockSendMail.mockResolvedValueOnce({ messageId: "<test-id@gmail.com>" })

    const { sendEmail } = await import("@/lib/email/transport")
    const result = await sendEmail(EMAIL_PAYLOAD)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.messageId).toBe("<test-id@gmail.com>")
    }
  })

  it("returns fail with a SAFE message when sendMail rejects", async () => {
    const rawError = new Error(
      `Connection refused by smtp.gmail.com auth user=${REQUIRED_ENV.SMTP_USER} pass=abcdefghijklmnop`
    )
    mockSendMail.mockRejectedValueOnce(rawError)

    const { sendEmail } = await import("@/lib/email/transport")
    const result = await sendEmail(EMAIL_PAYLOAD)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      // The raw error message (which may contain credentials) must NOT appear.
      expect(result.message).not.toContain("abcdefghijklmnop")
      expect(result.message).not.toContain(REQUIRED_ENV.SMTP_PASSWORD)
      // A safe generic message is returned instead.
      expect(result.message).toBe("Failed to send email.")
    }
  })

  it("uses SMTP_USER as From when EMAIL_FROM is not set", async () => {
    vi.stubEnv("EMAIL_FROM", "")
    mockSendMail.mockResolvedValueOnce({ messageId: "<id@gmail.com>" })

    const { sendEmail } = await import("@/lib/email/transport")
    await sendEmail(EMAIL_PAYLOAD)

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: REQUIRED_ENV.SMTP_USER })
    )
  })

  it("uses EMAIL_FROM when set", async () => {
    vi.stubEnv("EMAIL_FROM", "Academy <academy@example.com>")
    mockSendMail.mockResolvedValueOnce({ messageId: "<id@gmail.com>" })

    const { sendEmail } = await import("@/lib/email/transport")
    await sendEmail(EMAIL_PAYLOAD)

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ from: "Academy <academy@example.com>" })
    )
  })
})
