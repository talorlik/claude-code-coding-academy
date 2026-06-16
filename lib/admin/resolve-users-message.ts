/**
 * Stable admin user-management notice/error codes that the data-layer server
 * actions may carry in a URL query param (e.g. `?notice=roleChanged`,
 * `?error=lastInstructor`).
 *
 * The FormData actions in {@link import("./users-actions")} redirect with one of
 * these codes rather than literal text, so the admin pages render localized
 * feedback server-side - which is what makes the forms work with JavaScript
 * disabled. Only codes in this allowlist resolve to a message; an unknown or
 * hand-crafted query param resolves to `null` and renders nothing, so a forged
 * `?error=...` cannot reflect arbitrary text into the page. The codes double as
 * the message keys in the `AdminUsers.messages` namespace of
 * `messages/<locale>.json`.
 *
 * This mirrors {@link import("@/lib/profile/resolve-profile-message")} but is a
 * separate, admin-scoped allowlist so the namespaces stay independent.
 */
export const ADMIN_USERS_MESSAGE_CODES = [
  // success notices, one per action so the page banner is unambiguous
  "inviteSent",
  "roleChanged",
  "userDisabled",
  "userEnabled",
  "userDeleted",
  // validation / failure codes
  "invalidEmail",
  "invalidRole",
  "inviteFailed",
  "roleChangeFailed",
  "disableFailed",
  "deleteFailed",
  "userNotFound",
  // guard refusals (self-protection + last-instructor lockout prevention)
  "cannotSelf",
  "lastInstructor",
] as const

/** A recognized admin user-management message code. */
export type AdminUsersMessageCode = (typeof ADMIN_USERS_MESSAGE_CODES)[number]

const CODE_SET = new Set<string>(ADMIN_USERS_MESSAGE_CODES)

/**
 * Narrows an arbitrary query-param string to a known
 * {@link AdminUsersMessageCode}.
 *
 * @param code - The raw value of an `error`/`notice` query param.
 * @returns `true` when `code` is in the allowlist.
 */
export function isAdminUsersMessageCode(
  code: string | undefined
): code is AdminUsersMessageCode {
  return code !== undefined && CODE_SET.has(code)
}

/**
 * Resolves a stable admin code to its localized, user-facing string using a
 * next-intl translator bound to the `AdminUsers.messages` namespace.
 *
 * The allowlist check happens before translation, so only known codes produce
 * text; anything else yields `null` and the caller renders nothing. This keeps
 * the anti-injection property: a forged `?error=<script>` never reaches the
 * translator.
 *
 * @param translate - A translator for the `AdminUsers.messages` namespace, e.g.
 *   from `getTranslations("AdminUsers.messages")`.
 * @param code - The raw `error`/`notice` query-param value.
 * @returns The localized message, or `null` for an absent/unknown code.
 */
export function resolveAdminUsersMessage(
  translate: (key: AdminUsersMessageCode) => string,
  code: string | undefined
): string | null {
  if (!isAdminUsersMessageCode(code)) return null
  return translate(code)
}
