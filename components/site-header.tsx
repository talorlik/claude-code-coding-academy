import { getTranslations } from "next-intl/server"

import { Link } from "@/i18n/navigation"
import { createClient } from "@/lib/supabase/server"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ModeToggle } from "@/components/mode-toggle"

/**
 * Global top navigation, server-rendered so it reflects the current auth state
 * on every page. Signed-out visitors see a Sign in link; signed-in users see
 * Dashboard and Chat links plus a Sign out control. The brand always links home.
 * All links use the locale-aware {@link Link} so they preserve the active
 * language; labels come from the `Nav` namespace. Sign-out posts to the
 * non-localized `/auth/signout` route (POST so it cannot be triggered by a
 * cross-site navigation or prefetch).
 */
export async function SiteHeader() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const t = await getTranslations("Nav")
  const common = await getTranslations("Common")

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-6 py-3">
        <Link href="/" className="flex shrink-0 items-center font-mono text-sm font-medium">
          {common("appName")}
        </Link>

        <nav
          aria-label={t("mainNavigation")}
          className="flex min-w-0 flex-1 items-center justify-end gap-4 text-sm"
        >
          {user ? (
            <>
              <Link href="/dashboard" className="hover:underline">
                {t("dashboard")}
              </Link>
              <Link href="/chat" className="hover:underline">
                {t("chat")}
              </Link>
              <form action="/auth/signout" method="post">
                <button type="submit" className="hover:underline">
                  {t("signOut")}
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="hover:underline">
              {t("signIn")}
            </Link>
          )}
          <LanguageSwitcher />
          <ModeToggle />
        </nav>
      </div>
    </header>
  )
}
