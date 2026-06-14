/**
 * Stable notice/error codes the contact server action carries in a URL query
 * param (e.g. `?notice=messageSent`, `?error=invalidEmail`).
 *
 * The action redirects with one of these codes rather than literal text. Only
 * codes in this allowlist resolve to a message; an unknown or hand-crafted query
 * param resolves to `null` and renders nothing, so a forged `?error=...` cannot
 * reflect arbitrary text into the page. The codes double as message keys under
 * the `Contact.messages` namespace of `messages/<locale>.json`, which supplies
 * the localized, user-facing text. Mirrors the auth message channel in
 * `lib/auth/resolve-auth-message.ts`.
 */
export const CONTACT_MESSAGE_CODES = [
  "messageSent",
  "nameRequired",
  "invalidEmail",
  "messageTooShort",
  "messageTooLong",
  "submissionFailed",
] as const

/** A recognized contact message code. */
export type ContactMessageCode = (typeof CONTACT_MESSAGE_CODES)[number]

const CODE_SET = new Set<string>(CONTACT_MESSAGE_CODES)

/**
 * Narrows an arbitrary query-param string to a known {@link ContactMessageCode}.
 *
 * @param code - The raw value of an `error`/`notice` query param.
 * @returns `true` when `code` is in the allowlist.
 */
export function isContactMessageCode(
  code: string | undefined
): code is ContactMessageCode {
  return code !== undefined && CODE_SET.has(code)
}

/**
 * Resolves a stable contact code to its localized, user-facing string using a
 * next-intl translator bound to the `Contact.messages` namespace.
 *
 * The allowlist check happens before translation, so only known codes produce
 * text; anything else yields `null` and the caller renders nothing. This keeps
 * the anti-injection property: a forged `?error=<script>` never reaches the
 * translator.
 *
 * @param translate - A translator for the `Contact.messages` namespace, e.g.
 *   from `getTranslations("Contact.messages")`.
 * @param code - The raw `error`/`notice` query-param value.
 * @returns The localized message, or `null` for an absent/unknown code.
 */
export function resolveContactMessage(
  translate: (key: ContactMessageCode) => string,
  code: string | undefined
): string | null {
  if (!isContactMessageCode(code)) return null
  return translate(code)
}
