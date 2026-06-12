/**
 * Resolves where a just-authenticated user should land. Returns a
 * locale-agnostic in-app path WITHOUT a locale prefix; callers are responsible
 * for applying the active locale (via the locale-aware `redirect` helper for
 * server actions, or by writing the path onto a `NextResponse` redirect URL in
 * a route handler).
 *
 * Both roles (instructor and student) currently land on `/dashboard`, a single
 * protected landing. Role-specific routing can branch here later; keeping it a
 * pure function of the user id leaves it small and exhaustively testable.
 *
 * It deliberately does NOT accept or honor any external `?redirect=` / `next`
 * target. Same-site redirect precedence is handled by the callers (the login
 * action and the email-confirm route).
 *
 * The authenticated user's id is accepted so callers have a stable signature and
 * future role-specific routing can branch on it without a call-site change.
 *
 * @param userId - The authenticated user's id (reserved for future
 *   role-specific routing).
 * @returns A non-localized in-app path.
 */
export async function resolvePostAuthDestination(
  userId: string
): Promise<string> {
  void userId
  return "/dashboard"
}
