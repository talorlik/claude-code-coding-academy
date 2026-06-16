/**
 * Stable profile notice/error codes that the profile form server actions may
 * carry in a URL query param (e.g. `?notice=detailsSaved`, `?error=saveFailed`).
 *
 * The FormData-accepting profile wrappers in
 * {@link import("./profile-actions")} redirect with one of these codes rather
 * than literal text, so the `/profile` page can render localized feedback
 * server-side - which is what makes the forms work with JavaScript disabled.
 * Only codes in this allowlist resolve to a message; an unknown or hand-crafted
 * query param resolves to `null` and renders nothing, so a forged `?error=...`
 * cannot reflect arbitrary text into the page. The codes double as the message
 * keys in the `Profile` namespace of `messages/<locale>.json`.
 *
 * This mirrors {@link import("@/lib/auth/resolve-auth-message")} but is a
 * separate, profile-scoped allowlist so the two namespaces stay independent.
 */
export const PROFILE_MESSAGE_CODES = [
  // success notices, one per form so the page banner is unambiguous
  "detailsSaved",
  "emailConfirmSent",
  "passwordUpdated",
  "avatarUpdated",
  "localeUpdated",
  // validation / failure codes
  "saveFailed",
  "invalidName",
  "invalidEmail",
  "emailUpdateFailed",
  "passwordsDoNotMatch",
  "passwordTooShort",
  "passwordUpdateFailed",
  "invalidAvatar",
  "avatarUploadFailed",
  "invalidLocale",
  "localeUpdateFailed",
  // defensive: the page is requireUser()-guarded, so this is rarely reachable
  "signedOut",
] as const

/** A recognized profile message code. */
export type ProfileMessageCode = (typeof PROFILE_MESSAGE_CODES)[number]

const CODE_SET = new Set<string>(PROFILE_MESSAGE_CODES)

/**
 * Narrows an arbitrary query-param string to a known {@link ProfileMessageCode}.
 *
 * @param code - The raw value of an `error`/`notice` query param.
 * @returns `true` when `code` is in the allowlist.
 */
export function isProfileMessageCode(
  code: string | undefined
): code is ProfileMessageCode {
  return code !== undefined && CODE_SET.has(code)
}

/**
 * Resolves a stable profile code to its localized, user-facing string using a
 * next-intl translator bound to the `Profile` namespace.
 *
 * The allowlist check happens before translation, so only known codes produce
 * text; anything else yields `null` and the caller renders nothing. This keeps
 * the anti-injection property: a forged `?error=<script>` never reaches the
 * translator.
 *
 * @param translate - A translator for the `Profile` namespace, e.g. from
 *   `getTranslations("Profile")` (server) or `useTranslations` (client).
 * @param code - The raw `error`/`notice` query-param value.
 * @returns The localized message, or `null` for an absent/unknown code.
 */
export function resolveProfileMessage(
  translate: (key: ProfileMessageCode) => string,
  code: string | undefined
): string | null {
  if (!isProfileMessageCode(code)) return null
  return translate(code)
}
