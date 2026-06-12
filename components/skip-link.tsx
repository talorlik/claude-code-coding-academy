import { getTranslations } from "next-intl/server"

/**
 * Skip-to-content link. Visually hidden until it receives keyboard focus, then
 * it reveals at the start of the viewport so a keyboard or screen-reader user
 * can jump past the header straight to `#main-content`. It is the first focusable
 * element in the document. Every page must render a `<main id="main-content">`
 * for the target to resolve.
 */
export async function SkipLink() {
  const t = await getTranslations("Nav")
  return (
    <a
      href="#main-content"
      className="sr-only-focusable absolute start-4 top-4 z-50 rounded-md bg-background px-4 py-2 text-sm font-medium text-foreground shadow ring-1 ring-border"
    >
      {t("skipToContent")}
    </a>
  )
}
