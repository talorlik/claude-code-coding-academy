"use server"

import { revalidatePath } from "next/cache"
import { getLocale } from "next-intl/server"

import { redirect } from "@/i18n/navigation"
import {
  deleteUser,
  inviteUser,
  setUserDisabled,
  setUserRole,
} from "@/lib/admin/users"
import {
  disableSchema,
  inviteSchema,
  roleChangeSchema,
} from "@/lib/validation/admin-users"

/**
 * FormData server actions for the admin user-management area (Batch 26, Tier-2
 * no-JS). Each wrapper validates its input, calls the server-only data layer,
 * and ends in a next-intl `redirect` carrying a `?notice=`/`?error=` code from
 * the `AdminUsers.messages` allowlist. Reading FormData and redirecting is what
 * lets the forms submit and report a result with JavaScript disabled. The
 * redirect is the final statement on every branch and is never wrapped in
 * try/catch: next-intl's `redirect` signals by throwing, so catching it would
 * swallow the navigation.
 *
 * Destructive actions (disable, delete) require an explicit confirm step: the
 * form must submit `confirm=yes`. A first submit without it redirects back with
 * a `confirm` flag so the page can render an "are you sure?" affordance; only
 * the confirmed submit performs the mutation. This makes destructive actions
 * never one-click.
 */

/** Locale-relative base path for the users list. */
const USERS_PATH = "/admin/users"

/** Builds the locale-relative detail path for one user. */
function userPath(userId: string): string {
  return `${USERS_PATH}/${userId}`
}

/** Refreshes both locales' cached renders of the list and a detail page. */
function revalidateUsers(userId?: string): void {
  revalidatePath("/[locale]/admin/users", "page")
  if (userId) {
    revalidatePath("/[locale]/admin/users/[userId]", "page")
  }
}

/**
 * Invites a new user by email and assigns a role. Bound to the invite form on
 * the list page. Reads `email` and `role`.
 */
export async function inviteUserAction(formData: FormData): Promise<void> {
  const locale = await getLocale()

  const parsed = inviteSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    role: String(formData.get("role") ?? ""),
  })
  if (!parsed.success) {
    const code = parsed.error.issues.some((i) => i.path.includes("role"))
      ? "invalidRole"
      : "invalidEmail"
    redirect({ href: `${USERS_PATH}?error=${code}`, locale })
  } else {
    const result = await inviteUser(parsed.data.email, parsed.data.role)
    revalidateUsers()
    redirect({
      href: result.ok
        ? `${USERS_PATH}?notice=inviteSent`
        : `${USERS_PATH}?error=${result.message}`,
      locale,
    })
  }
}

/**
 * Changes a user's role. Bound to the role form on the detail page. Reads
 * `userId` and `role`. On a guard refusal the data layer returns a code
 * (`cannotSelf`, `lastInstructor`) that is reflected back as `?error=`.
 */
export async function setUserRoleAction(formData: FormData): Promise<void> {
  const locale = await getLocale()
  const userId = String(formData.get("userId") ?? "")

  const parsed = roleChangeSchema.safeParse({
    userId,
    role: String(formData.get("role") ?? ""),
  })
  if (!parsed.success) {
    redirect({ href: `${userPath(userId)}?error=invalidRole`, locale })
  } else {
    const result = await setUserRole(parsed.data.userId, parsed.data.role)
    revalidateUsers(parsed.data.userId)
    redirect({
      href: result.ok
        ? `${userPath(parsed.data.userId)}?notice=roleChanged`
        : `${userPath(parsed.data.userId)}?error=${result.message}`,
      locale,
    })
  }
}

/**
 * Enables or disables (reactivates or bans) a user account. Bound to the
 * disable/enable form on the detail page. Reads `userId`, `disabled` ("true" to
 * disable), and `confirm`. Disabling requires `confirm=yes`; a first submit
 * redirects back with `?confirm=disable` so the page can prompt. Enabling is not
 * destructive and applies immediately.
 */
export async function setUserDisabledAction(formData: FormData): Promise<void> {
  const locale = await getLocale()
  const userId = String(formData.get("userId") ?? "")
  const disabled = String(formData.get("disabled") ?? "") === "true"

  const parsed = disableSchema.safeParse({ userId, disabled })
  if (!parsed.success) {
    redirect({ href: `${userPath(userId)}?error=disableFailed`, locale })
  } else {
    // Disabling is destructive-ish (locks the user out): require confirmation.
    if (parsed.data.disabled && String(formData.get("confirm")) !== "yes") {
      redirect({ href: `${userPath(parsed.data.userId)}?confirm=disable`, locale })
    } else {
      const result = await setUserDisabled(
        parsed.data.userId,
        parsed.data.disabled
      )
      revalidateUsers(parsed.data.userId)
      const notice = parsed.data.disabled ? "userDisabled" : "userEnabled"
      redirect({
        href: result.ok
          ? `${userPath(parsed.data.userId)}?notice=${notice}`
          : `${userPath(parsed.data.userId)}?error=${result.message}`,
        locale,
      })
    }
  }
}

/**
 * Permanently deletes a user. Bound to the delete form on the detail page.
 * Reads `userId` and `confirm`. Requires `confirm=yes`; a first submit redirects
 * back with `?confirm=delete` so the page renders an explicit confirm affordance.
 * On success it redirects to the list (the detail page no longer exists).
 */
export async function deleteUserAction(formData: FormData): Promise<void> {
  const locale = await getLocale()
  const userId = String(formData.get("userId") ?? "")

  if (!userId) {
    redirect({ href: `${USERS_PATH}?error=userNotFound`, locale })
  } else if (String(formData.get("confirm")) !== "yes") {
    // Never one-click: bounce back to the detail page in confirm mode.
    redirect({ href: `${userPath(userId)}?confirm=delete`, locale })
  } else {
    const result = await deleteUser(userId)
    revalidateUsers(userId)
    redirect({
      href: result.ok
        ? `${USERS_PATH}?notice=userDeleted`
        : `${userPath(userId)}?error=${result.message}`,
      locale,
    })
  }
}
