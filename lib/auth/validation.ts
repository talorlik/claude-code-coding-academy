const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

/**
 * True when `email` looks like a valid address. Trims before testing.
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim())
}
