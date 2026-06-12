import { getLocale } from "next-intl/server"

import { redirect } from "@/i18n/navigation"
import { getCurrentUserRole } from "@/lib/auth/roles"

/**
 * Server-side guard requiring any authenticated user. Redirects signed-out
 * visitors to the localized login page, carrying a `signInToContinue` notice,
 * and preserving the active locale. Returns the user's id on success, so a
 * normal return proves an authenticated session.
 *
 * Use this at the top of any layout, page, or server action that must be
 * reachable only by a signed-in user. Authorization (role) is a separate
 * concern: see {@link requireInstructor}.
 *
 * @returns The authenticated user's id.
 */
export async function requireUser(): Promise<string> {
  const locale = await getLocale()
  const { userId } = await getCurrentUserRole()

  if (!userId) {
    return redirect({ href: "/login?notice=signInToContinue", locale })
  }

  return userId
}

/**
 * Server-side guard for instructor-only surfaces. Redirects signed-out visitors
 * to the localized login page and authenticated non-instructors to the
 * localized home page, preserving the active locale. Returns the instructor
 * user's id on success.
 *
 * "Instructor" maps to the `instructor` role in `user_roles` (the role enum is
 * `instructor | student`); the SQL helper `is_instructor()` uses the same
 * mapping. This is the authoritative server-side authorization check for
 * instructor routes.
 *
 * @returns The authenticated instructor user's id.
 */
export async function requireInstructor(): Promise<string> {
  const locale = await getLocale()
  const { userId, isInstructor } = await getCurrentUserRole()

  if (!userId) {
    return redirect({ href: "/login?notice=signInToContinue", locale })
  }
  if (!isInstructor) {
    return redirect({ href: "/", locale })
  }

  return userId
}
