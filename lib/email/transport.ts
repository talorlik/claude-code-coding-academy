import "server-only"

import nodemailer from "nodemailer"

import { fail, ok } from "@/lib/types/action-result"
import type { ActionResult } from "@/lib/types/action-result"

/**
 * Builds a nodemailer SMTP transport from environment variables read at call
 * time (not module load), so tests can stub `process.env` before importing.
 *
 * Port semantics:
 * - 465  -> `secure: true`  (implicit TLS / SMTPS).
 * - Other -> `secure: false` (STARTTLS; nodemailer upgrades via EHLO STARTTLS).
 *
 * Required env: SMTP_HOST, SMTP_USER, SMTP_PASSWORD.
 * Optional env: SMTP_PORT (default 465).
 *
 * @returns The configured nodemailer transport, or null when any required var
 *          is missing (callers should return a graceful fail instead of throwing).
 */
export function getTransport(): nodemailer.Transporter | null {
  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  // Strip spaces from App Passwords; Gmail occasionally formats them with spaces.
  const password = (process.env.SMTP_PASSWORD ?? "").replace(/ /g, "")

  if (!host || !user || !password) {
    return null
  }

  const port = parseInt(process.env.SMTP_PORT ?? "465", 10)
  const secure = port === 465

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass: password },
  })
}

/**
 * Sends a transactional email via the configured SMTP transport.
 *
 * The From address is `EMAIL_FROM` when set, otherwise `SMTP_USER`. Both must
 * be a valid RFC 5321 address; using a display-name form (`"Name" <addr>`) is
 * allowed.
 *
 * Error handling:
 * - Missing SMTP configuration -> `fail("Email provider not configured.")`
 * - Transport rejection -> `fail("Failed to send email.")` - the raw nodemailer
 *   error is never returned to the caller and never logged at WARN/ERROR level
 *   with the password, guarding against credential leaks in log aggregators.
 *
 * @param options.to      - Recipient email address.
 * @param options.subject - Email subject line.
 * @param options.text    - Plain-text body (fallback for email clients).
 * @param options.html    - HTML body.
 * @returns `ok({ messageId })` on success or `fail(safeMessage)` on error.
 */
export async function sendEmail({
  to,
  subject,
  text,
  html,
}: {
  to: string
  subject: string
  text: string
  html: string
}): Promise<ActionResult<{ messageId: string }>> {
  const transport = getTransport()

  if (!transport) {
    return fail<{ messageId: string }>("Email provider not configured.")
  }

  // Use EMAIL_FROM only when it has a non-empty value; fall back to SMTP_USER.
  const from =
    (process.env.EMAIL_FROM || process.env.SMTP_USER) ?? "noreply@example.com"

  try {
    const info = await transport.sendMail({ from, to, subject, text, html })
    return ok<{ messageId: string }>({ messageId: info.messageId as string })
  } catch {
    // Do NOT log the raw error - it may contain credentials from the transport
    // auth object serialized in the Error message by some nodemailer versions.
    return fail<{ messageId: string }>("Failed to send email.")
  }
}
