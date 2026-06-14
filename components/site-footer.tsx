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
        <nav aria-label={t("tagline")} className="flex items-center gap-4">
          <Link href="/" className="hover:underline">
            {t("home")}
          </Link>
        </nav>
      </div>
    </footer>
  )
}
