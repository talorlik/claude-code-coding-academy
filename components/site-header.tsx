import { getTranslations } from "next-intl/server"
import { Menu } from "lucide-react"

import { Link } from "@/i18n/navigation"
import { createClient } from "@/lib/supabase/server"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ModeToggle } from "@/components/mode-toggle"
import { InstallPrompt } from "@/components/install-prompt"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

/**
 * Global top navigation, server-rendered so it reflects the current auth state
 * on every page. On wide viewports the nav links sit inline; below the `md`
 * breakpoint they collapse into a hamburger Sheet drawer so the header never
 * overflows a phone. The language and theme controls stay visible at all widths;
 * only the links collapse. Signed-out visitors see a Sign in link; signed-in
 * users see Dashboard and Chat links plus a Sign out control. Labels come from
 * the `Nav` namespace; links use the locale-aware {@link Link}. Sign-out posts
 * to the non-localized `/auth/signout` route (POST so it cannot be triggered by
 * a cross-site navigation or prefetch).
 */
export async function SiteHeader() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const t = await getTranslations("Nav")
  const common = await getTranslations("Common")

  const navLinks = user
    ? [
        { href: "/dashboard", label: t("dashboard") },
        { href: "/chat", label: t("chat") },
        { href: "/search", label: t("search") },
      ]
    : [{ href: "/search", label: t("search") }]

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-x-4 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center font-mono text-sm font-medium"
        >
          {common("appName")}
        </Link>

        {/* Inline nav: visible from md up. */}
        <nav
          aria-label={t("mainNavigation")}
          className="hidden min-w-0 flex-1 items-center justify-end gap-4 text-sm md:flex"
        >
          {navLinks.map((item) => (
            <Link key={item.href} href={item.href} className="hover:underline">
              {item.label}
            </Link>
          ))}
          {user ? (
            <form action="/auth/signout" method="post">
              <button type="submit" className="hover:underline">
                {t("signOut")}
              </button>
            </form>
          ) : (
            <Link href="/login" className="hover:underline">
              {t("signIn")}
            </Link>
          )}
        </nav>

        {/* Controls cluster: always visible. ms-auto pushes it to the inline
            end on mobile, where the inline nav above is hidden. */}
        <div className="ms-auto flex items-center gap-2 md:ms-0">
          <InstallPrompt className="hidden sm:flex" />
          <LanguageSwitcher />
          <ModeToggle />

          {/* Sign in link for mobile is now inside the hamburger drawer. */}

          {/* Hamburger drawer: only below md. Always rendered (search is
              available to all). Sign-out only included when authenticated. */}
          <Sheet>
            <SheetTrigger
              render={
                <Button variant="outline" size="icon" className="md:hidden">
                  <Menu aria-hidden />
                  <span className="sr-only">{t("openMenu")}</span>
                </Button>
              }
            />
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>{t("mainNavigation")}</SheetTitle>
              </SheetHeader>
              <nav
                aria-label={t("mainNavigation")}
                className="flex flex-col gap-1 px-4 pb-4 text-sm"
              >
                {navLinks.map((item) => (
                  <SheetClose
                    key={item.href}
                    render={
                      <Link
                        href={item.href}
                        className="rounded-md px-2 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        {item.label}
                      </Link>
                    }
                  />
                ))}
                {user ? (
                  <SheetClose
                    render={
                      <form action="/auth/signout" method="post">
                        <button
                          type="submit"
                          className="w-full rounded-md px-2 py-2 text-start text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          {t("signOut")}
                        </button>
                      </form>
                    }
                  />
                ) : (
                  <SheetClose
                    render={
                      <Link
                        href="/login"
                        className="rounded-md px-2 py-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        {t("signIn")}
                      </Link>
                    }
                  />
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
