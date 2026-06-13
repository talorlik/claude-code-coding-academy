/**
 * Optional LIVE email test - sends a real email via Gmail SMTP.
 *
 * SKIPPED by default. To run:
 *   SMTP_LIVE_TEST=true npm run test -- tests/integration/email-live.test.ts
 *
 * Prerequisites:
 *   - .env.local must contain SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD.
 *   - The test self-sends to SMTP_USER (no student email is used).
 *   - Requires a live Gmail App Password (not a regular password).
 *
 * This test is intentionally excluded from `npm run test` and CI runs.
 * It exists as a manual smoke-test before production deploy to verify
 * that the Vercel environment can reach smtp.gmail.com on port 465.
 *
 * KNOWN RISK: Vercel serverless IPs may be blocked or throttled by Gmail.
 * If sends fail in production with "Connection refused" or auth errors,
 * migrate to an HTTP transactional provider (Resend, SendGrid) and update
 * lib/email/transport.ts to use their API instead of nodemailer SMTP.
 */

import { describe, expect, it, vi } from "vitest"

// server-only is a Next.js module that throws outside RSC environments.
// Mock it here the same way all other test files do.
vi.mock("server-only", () => ({}))

const LIVE = process.env.SMTP_LIVE_TEST === "true"

describe.skipIf(!LIVE)("LIVE: sendEmail via Gmail SMTP", () => {
  it(
    "sends a real email to SMTP_USER and returns a messageId",
    async () => {
      // Import after env is loaded so transport reads the real credentials.
      const { sendEmail } = await import("@/lib/email/transport")

      const to = process.env.SMTP_USER
      if (!to) {
        throw new Error("SMTP_USER must be set in .env.local to run this test")
      }

      const result = await sendEmail({
        to,
        subject: "[LIVE TEST] Coding Academy reminder smoke-test",
        text: "This is a live smoke-test from the Coding Academy test suite.",
        html: "<p>This is a <strong>live smoke-test</strong> from the Coding Academy test suite.</p>",
      })

      expect(result.ok).toBe(true)
      if (result.ok) {
        // messageId must be a non-empty string.
        expect(typeof result.data.messageId).toBe("string")
        expect(result.data.messageId.length).toBeGreaterThan(0)
        console.log("[LIVE TEST] messageId:", result.data.messageId)
      }
    },
    30_000 // 30-second timeout for SMTP handshake.
  )
})
