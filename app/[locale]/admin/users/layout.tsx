import { requireAdmin } from "@/lib/auth/guards"

/**
 * Defense-in-depth guard for the admin user-management tree. The parent
 * `app/[locale]/admin/layout.tsx` already calls `requireInstructor()` and owns
 * the `<main id="main-content">` landmark and the admin nav, so this layout adds
 * no markup of its own - it only re-asserts the admin gate (belt-and-suspenders
 * for a surface that exposes and mutates every account). Wrapping children in
 * another `<main>` here would create a duplicate landmark, so it does not.
 *
 * @param children - the nested users pages.
 */
export default async function AdminUsersLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAdmin()
  return <>{children}</>
}
