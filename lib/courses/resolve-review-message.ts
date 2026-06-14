/**
 * Stable notice/error codes the review server action carries in a URL query
 * param (e.g. `?notice=reviewSaved`, `?error=enrollmentRequired`).
 *
 * The action redirects with one of these codes rather than literal text. Only
 * codes in this allowlist resolve to a message; an unknown or hand-crafted query
 * param resolves to `null` and renders nothing, so a forged `?error=...` cannot
 * reflect arbitrary text into the page. The codes double as message keys under
 * the `Course.reviews.messages` namespace of `messages/<locale>.json`. Mirrors
 * the auth/contact message channels.
 */
export const REVIEW_MESSAGE_CODES = [
  "reviewSaved",
  "signInRequired",
  "enrollmentRequired",
  "invalidRating",
  "reviewTooLong",
  "submissionFailed",
] as const

/** A recognized review message code. */
export type ReviewMessageCode = (typeof REVIEW_MESSAGE_CODES)[number]

const CODE_SET = new Set<string>(REVIEW_MESSAGE_CODES)

/**
 * Narrows an arbitrary query-param string to a known {@link ReviewMessageCode}.
 *
 * @param code - The raw value of an `error`/`notice` query param.
 * @returns `true` when `code` is in the allowlist.
 */
export function isReviewMessageCode(
  code: string | undefined
): code is ReviewMessageCode {
  return code !== undefined && CODE_SET.has(code)
}

/**
 * Resolves a stable review code to its localized, user-facing string using a
 * next-intl translator bound to the `Course.reviews.messages` namespace.
 *
 * The allowlist check happens before translation, so only known codes produce
 * text; anything else yields `null` and the caller renders nothing. This keeps
 * the anti-injection property: a forged `?error=<script>` never reaches the
 * translator.
 *
 * @param translate - A translator for the `Course.reviews.messages` namespace.
 * @param code - The raw `error`/`notice` query-param value.
 * @returns The localized message, or `null` for an absent/unknown code.
 */
export function resolveReviewMessage(
  translate: (key: ReviewMessageCode) => string,
  code: string | undefined
): string | null {
  if (!isReviewMessageCode(code)) return null
  return translate(code)
}
