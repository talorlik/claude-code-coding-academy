import { getTranslations } from "next-intl/server"

import { Link } from "@/i18n/navigation"

/**
 * Global footer landmark. Server-rendered. The nav has an explicit accessible
 * name so assistive tech distinguishes it from the header nav. The year is
 * computed once per render for the copyright line.
 */
export async function SiteFooter() {
  const t = await getTranslations("Footer")
  const year = new Date().getFullYear()

  return (
    <footer className="mt-auto border-t bg-background">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 px-6 py-6 text-sm text-muted-foreground">
        <p className="text-center">{t("rights", { year })}</p>
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
      </div>
    </footer>
  )
}
