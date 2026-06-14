"use server"

import "server-only"

import { getLocale } from "next-intl/server"

import { redirect } from "@/i18n/navigation"
import { parseWithSchema } from "@/lib/validation/parse"
import { contactMessageSchema } from "@/lib/validation/contact"
import type { ContactMessageCode } from "@/lib/contact/resolve-contact-message"

/**
 * Maps a Zod field error (keyed by field name in {@link parseWithSchema}'s
 * `fieldErrors`) to a stable, allowlisted contact message code. Returning a code
 * - not the raw Zod string - keeps the `?error=` channel anti-injection safe and
 * lets the page render a localized message. The first failing field in form
 * order (name, email, message) wins, so the banner points at the first problem.
 */
function firstErrorCode(
  fieldErrors: Record<string, string> | undefined
): ContactMessageCode {
  if (!fieldErrors) return "submissionFailed"
  if (fieldErrors.name) return "nameRequired"
  if (fieldErrors.email) return "invalidEmail"
  if (fieldErrors.message) {
    // The schema's only two message failures are too-short and too-long; the
    // long bound is the larger number, so disambiguate by message text.
    return fieldErrors.message.includes("long")
      ? "messageTooLong"
      : "messageTooShort"
  }
  return "submissionFailed"
}

/**
 * Handles a public contact-form submission (Batch 16). Demo-grade and no-JS:
 * it validates the posted {@link FormData} server-side via
 * {@link contactMessageSchema}, then acknowledges through the `?notice=`/
 * `?error=` query-param channel resolved to a localized banner on `/contact`.
 *
 * No personal data is persisted and no email is sent: the validated message is
 * logged server-side only (the queue-before-a-provider-exists pattern the
 * reminders feature used before SMTP was wired). Forwarding via
 * `lib/email/transport.ts` is intentionally out of scope so the batch needs no
 * new secrets and cannot leak submitted data.
 *
 * Validation is independent of the HTML `required`/`maxlength` attributes, which
 * a client can bypass; only allowlisted codes are ever reflected back into the
 * URL.
 *
 * @param formData - The submitted form fields (`name`, `email`, `message`).
 */
export async function submitContactMessage(formData: FormData): Promise<void> {
  const locale = await getLocale()

  const parsed = parseWithSchema(contactMessageSchema, {
    name: formData.get("name"),
    email: formData.get("email"),
    message: formData.get("message"),
  })

  if (!parsed.ok) {
    const code = firstErrorCode(parsed.fieldErrors)
    return redirect({ href: `/contact?error=${code}`, locale })
  }

  // Demo-grade acknowledgement: log server-side only. Never echo the email or
  // body back into the URL or a client-visible surface. A real deployment would
  // forward this through lib/email/transport.ts or persist it to a table behind
  // RLS; that is deferred (see docs/planning/IMPLEMENTATION_LOG.md).
  console.info(
    `[contact] message received (len=${parsed.data.message.length}, locale=${locale})`
  )

  return redirect({ href: `/contact?notice=messageSent`, locale })
}
