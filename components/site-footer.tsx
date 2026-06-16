import { getTranslations } from "next-intl/server"

import { Link } from "@/i18n/navigation"

/**
 * Global footer landmark. Server-rendered. Sits on the DESIGN.md
 * `--color-surface` with muted text. The brand logo was removed here (issue
 * #10): it duplicated the header wordmark on every page; the footer now leads
 * with the muted link row. The nav has an explicit accessible name so assistive
 * tech distinguishes it from the header nav. The year is computed once per
 * render for the copyright line.
 */
export async function SiteFooter() {
  const t = await getTranslations("Footer")
  const year = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t border-border bg-card">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-6 py-8 text-sm text-muted-foreground">
        <nav
          aria-label={t("tagline")}
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2"
        >
          <Link href="/" className="hover:underline">
            {t("home")}
          </Link>
          <Link href="/courses" className="hover:underline">
            {t("courses")}
          </Link>
          <Link href="/about" className="hover:underline">
            {t("about")}
          </Link>
          <Link href="/contact" className="hover:underline">
            {t("contact")}
          </Link>
        </nav>
        <p className="text-center">{t("rights", { year })}</p>
      </div>
    </footer>
  )
}
