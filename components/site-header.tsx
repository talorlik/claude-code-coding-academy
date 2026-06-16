import { getTranslations } from "next-intl/server"
import { Menu, Search } from "lucide-react"

import { Link } from "@/i18n/navigation"
import { createClient } from "@/lib/supabase/server"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ModeToggle } from "@/components/mode-toggle"
import { InstallPrompt } from "@/components/install-prompt"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * Global top navigation, server-rendered so it reflects the current auth state
 * on every page. Styled to the DESIGN.md Navigation Bar: ~64px tall, the
 * `--color-nav-bg` surface with the existing backdrop blur, a hairline bottom
 * border, the theme-scoped {@link Logo} at the inline start, and Inter 14px/500
 * nav links. On wide viewports the nav links sit inline; below the `md`
 * breakpoint they collapse into a hamburger Sheet drawer so the header never
 * overflows a phone. The language and theme controls stay visible at all widths;
 * only the links collapse. Signed-out visitors see a Sign in link; signed-in
 * users see Dashboard, Profile, and Search links plus a Sign out control (the
 * Profile link is visible to both roles when authenticated). Labels come from
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

  const searchLabel = t("searchLabel")

  // Text links shown inline (md+) and in the drawer. The public content links
  // (Courses, About, Contact) show for everyone; Dashboard is signed-in only.
  // Search is handled separately as an icon inline; the drawer keeps it as a
  // labelled list item.
  const textLinks = [
    { href: "/courses", label: t("courses") },
    { href: "/about", label: t("about") },
    { href: "/contact", label: t("contact") },
    ...(user
      ? [
          { href: "/dashboard", label: t("dashboard") },
          // Profile is reachable by both roles when authenticated; it sits
          // inline on md+ and in the drawer below md (drawerLinks derives from
          // textLinks).
          { href: "/profile", label: t("profile") },
        ]
      : []),
  ]
  // The search affordance points at the /courses catalog, whose search box is
  // the course-level search (batch 18 replaced the standalone /search page; the
  // /search route still redirects to /courses for old links).
  const drawerLinks = [...textLinks, { href: "/courses", label: t("search") }]

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-[var(--color-nav-bg)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-x-4 px-4 sm:px-6">
        <Link
          href="/"
          aria-label={t("home")}
          className="flex shrink-0 items-center"
        >
          {/* The logo PNG is 4:3, so width={120} renders ~90px tall and would
              cross the 64px header's bottom hairline (issue #9). Cap the inner
              <Image> height to the header content box (max-h-9 == 36px) and let
              width follow the aspect ratio; capping the image (not just the
              wrapping span) is what actually clips it. */}
          <Logo
            width={120}
            priority
            className="[&_img]:max-h-9 [&_img]:w-auto"
          />
        </Link>

        {/* Inline nav: visible from md up. Search is an icon-only control with
            a tooltip; Sign in / Sign out moves out of the nav to the header's
            inline end (see the trailing block below). */}
        <nav
          aria-label={t("mainNavigation")}
          className="hidden min-w-0 flex-1 items-center justify-end gap-4 text-sm font-medium md:flex"
        >
          {textLinks.map((item) => (
            <Link key={item.href} href={item.href} className="hover:underline">
              {item.label}
            </Link>
          ))}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Link
                    href="/courses"
                    aria-label={searchLabel}
                    className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Search className="size-5" aria-hidden />
                  </Link>
                }
              />
              <TooltipContent>{searchLabel}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
                {drawerLinks.map((item) => (
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

        {/* Sign in / Sign out: pinned to the header's inline end (far right in
            LTR, far left in RTL) on md+. On mobile it lives in the drawer. */}
        {user ? (
          <form action="/auth/signout" method="post" className="hidden md:block">
            <button type="submit" className="text-sm hover:underline">
              {t("signOut")}
            </button>
          </form>
        ) : (
          <Link href="/login" className="hidden text-sm hover:underline md:block">
            {t("signIn")}
          </Link>
        )}
      </div>
    </header>
  )
}
