import Image from "next/image"
import { useTranslations } from "next-intl"

import { cn } from "@/lib/utils"

/** Intrinsic pixel dimensions of the brand logo PNGs (both are 1448x1086). */
const LOGO_INTRINSIC_WIDTH = 1448
const LOGO_INTRINSIC_HEIGHT = 1086
const LOGO_ASPECT = LOGO_INTRINSIC_HEIGHT / LOGO_INTRINSIC_WIDTH

/**
 * Theme-aware brand logo.
 *
 * Renders BOTH theme variants (`/brand/logo_light.png` and
 * `/brand/logo_dark.png`) into the DOM and lets CSS - not JavaScript - decide
 * which is visible via the `data-logo` swap defined in `app/globals.css`. This
 * keeps the correct mark showing with no JS and no hydration flash: the dark
 * mark wins under an explicit `.dark` class and, for JS-disabled dark-OS
 * visitors, under `prefers-color-scheme: dark`; an explicit `.light` class
 * always re-asserts the light mark.
 *
 * The PNGs carry a baked-in (non-transparent) background per theme, which is
 * exactly why the swap is required rather than a single tinted asset. Both
 * variants carry the same localized alt text from the `Brand` namespace; the
 * hidden variant is removed from the accessibility tree by its CSS
 * `display: none`, so assistive tech announces the wordmark exactly once in
 * either theme. The component is intentionally not a heading; callers wrap it
 * in a link or heading as the surrounding layout requires.
 *
 * @param width - Rendered width in pixels. Height is derived from the intrinsic
 *   4:3 aspect ratio. Defaults to 160.
 * @param priority - Forwards Next.js `priority` to both images (use for an
 *   above-the-fold header logo to avoid lazy-load delay). Defaults to false.
 * @param className - Extra classes applied to the wrapping element.
 */
export function Logo({
  width = 160,
  priority = false,
  className,
}: {
  width?: number
  priority?: boolean
  className?: string
}) {
  const t = useTranslations("Brand")
  const alt = t("logoAlt")
  const height = Math.round(width * LOGO_ASPECT)

  return (
    <span className={cn("inline-flex shrink-0 items-center", className)}>
      <Image
        data-logo="light"
        src="/brand/logo_light.png"
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className="h-auto w-auto"
      />
      <Image
        data-logo="dark"
        src="/brand/logo_dark.png"
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className="h-auto w-auto"
      />
    </span>
  )
}
