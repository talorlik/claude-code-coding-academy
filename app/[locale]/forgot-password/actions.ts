"use server"

import { getLocale } from "next-intl/server"

import { redirect } from "@/i18n/navigation"
import { createClient } from "@/lib/supabase/server"
import { isValidEmail } from "@/lib/auth/validation"
import { getSiteUrl } from "@/lib/utils/site-url"

/**
 * Sends a password-reset email via Supabase. The link routes through
 * /auth/confirm, which exchanges the recovery token for a session and then
 * redirects to /reset-password. Always reports the same generic notice
 * regardless of whether the email belongs to an account (no enumeration).
 */
export async function requestPasswordReset(formData: FormData) {
  const locale = await getLocale()
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase()

  if (!isValidEmail(email)) {
    return redirect({ href: `/forgot-password?error=invalidEmail`, locale })
  }

  const origin = getSiteUrl()
  const supabase = await createClient()

  // Intentionally ignore the result: surfacing success/failure per-email would
  // leak account existence.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/reset-password`,
  })

  return redirect({ href: `/forgot-password?notice=resetLinkSent`, locale })
}
