import { getTranslations, setRequestLocale } from "next-intl/server"

import { requireInstructor } from "@/lib/auth/require-user"
import { Link } from "@/i18n/navigation"
import type { Locale } from "@/i18n/routing"

/**
 * Admin shell layout. Guards ALL child routes by calling requireInstructor()
 * at the top - this is the authoritative server-side protection for the admin
 * tree. Pages under /admin/ render only after this check passes.
 *
 * One <h1> per PAGE, not here. This layout renders a nav landmark and links;
 * each child page owns its own <h1>.
 */
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  // Defense-in-depth guard. Redirects non-instructors before any child renders.
  await requireInstructor()

  const { locale } = await params
  setRequestLocale(locale as Locale)

  const t = await getTranslations("Admin")

  return (
    <div className="flex min-h-full min-w-0 flex-col overflow-x-hidden">
      <nav
        aria-label={t("title")}
        className="border-b bg-muted/40"
      >
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <span className="text-sm font-semibold text-foreground">
            {t("title")}
          </span>
          <Link
            href="/admin/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t("nav.dashboard")}
          </Link>
          <Link
            href="/admin/courses"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t("nav.courses")}
          </Link>
        </div>
      </nav>
      <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 overflow-x-hidden px-4 py-8">
        {children}
      </main>
    </div>
  )
}
