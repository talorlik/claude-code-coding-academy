import { isInstructor } from "@/lib/auth/roles"

/**
 * Resolves where a just-authenticated user should land. Returns a
 * locale-agnostic in-app path WITHOUT a locale prefix; callers are responsible
 * for applying the active locale (via the locale-aware `redirect` helper for
 * server actions, or by writing the path onto a `NextResponse` redirect URL in
 * a route handler).
 *
 * Routing branches on role: instructors land on the admin dashboard
 * (`/admin/dashboard`), students on their student dashboard (`/dashboard`).
 * Role is resolved through {@link isInstructor}, which reads `user_roles` under
 * RLS. Keeping this a pure function of the user id + role lookup leaves it small
 * and exhaustively testable.
 *
 * It deliberately does NOT accept or honor any external `?redirect=` / `next`
 * target. Same-site redirect precedence is handled by the callers (the login
 * action and the email-confirm route); a safe `?redirect=` target wins over the
 * value returned here.
 *
 * @param userId - The authenticated user's id, used for the role lookup.
 * @returns A non-localized in-app path: `/admin/dashboard` for instructors,
 *   `/dashboard` otherwise.
 */
export async function resolvePostAuthDestination(
  userId: string
): Promise<string> {
  return (await isInstructor(userId)) ? "/admin/dashboard" : "/dashboard"
}
