import Image from "next/image"
import { getTranslations } from "next-intl/server"

import { cn } from "@/lib/utils"
import { UNSPLASH_IMAGES, type UnsplashImageName } from "@/lib/images/unsplash"

/**
 * Renders one curated, self-hosted Unsplash coding photo (Batch 23) as content
 * media: a `next/image` inside a theme-token frame, an optional low-opacity
 * theme scrim so overlaid text stays legible in both themes, the localized alt
 * text, and the photographer attribution Unsplash requires.
 *
 * Theme coherence: the frame border, radius, scrim, and credit line are all
 * built from DESIGN.md theme tokens (via the shared Tailwind token classes
 * `border-border`, `bg-background`, `text-muted-foreground`, etc.), so the photo
 * reads correctly in light and dark without per-theme branching. The photo
 * itself is exempt from the palette-only rule (it is content media); its framing
 * is not.
 *
 * No-JS safe and server-component friendly: `next/image` degrades to a plain
 * `<img>` without client JS, the credit links are real anchors, and nothing here
 * needs hydration. Decorative-only placements pass `alt=""` and `showCredit={false}`
 * and must surface the attribution in a nearby consolidated credit line instead
 * (see {@link UnsplashCreditLine}).
 *
 * @see lib/images/unsplash.ts - the attribution source of truth.
 */
export async function UnsplashImage({
  name,
  className,
  imageClassName,
  sizes = "(max-width: 768px) 100vw, 50vw",
  priority = false,
  aspect = "aspect-video",
  rounded = "rounded-[var(--radius-cards)]",
  scrim = false,
  alt,
  showCredit = true,
  children,
}: {
  /** Which curated photo to render. */
  name: UnsplashImageName
  /** Extra classes for the outer frame element. */
  className?: string
  /** Extra classes for the `<Image>` itself (composed with `object-cover`). */
  imageClassName?: string
  /** `next/image` `sizes` hint; tune per placement to avoid overfetching. */
  sizes?: string
  /** Pass `true` for an above-the-fold photo to opt out of lazy loading. */
  priority?: boolean
  /** Tailwind aspect-ratio class controlling the frame's intrinsic box. */
  aspect?: string
  /** Tailwind radius class for the frame (a theme-token radius). */
  rounded?: string
  /** When true, overlays a low-opacity theme scrim for legible overlaid text. */
  scrim?: boolean
  /**
   * Override the localized alt text. Pass `alt=""` for a decorative placement
   * (then set `showCredit={false}` and credit it nearby). When omitted, the alt
   * comes from `Imagery.alt.<altKey>`.
   */
  alt?: string
  /** When true (default), renders the inline "Photo by … on Unsplash" credit. */
  showCredit?: boolean
  /** Content overlaid on the photo (e.g. a page title), above the scrim. */
  children?: React.ReactNode
}) {
  const meta = UNSPLASH_IMAGES[name]
  const t = await getTranslations("Imagery")

  const altText = alt ?? t(`alt.${meta.altKey}`)

  return (
    <figure className={cn("min-w-0", className)}>
      <div
        className={cn(
          "relative w-full overflow-hidden border border-border",
          aspect,
          rounded,
        )}
      >
        <Image
          src={meta.src}
          alt={altText}
          fill
          sizes={sizes}
          priority={priority}
          className={cn("object-cover", imageClassName)}
        />

        {/* Low-opacity theme scrim: darkens/lightens via the page-bg token so
            any overlaid text meets WCAG AA in BOTH themes. Decorative. */}
        {scrim ? (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/45 to-background/15"
          />
        ) : null}

        {/* Overlaid content (e.g. a course title) sits above the scrim. */}
        {children ? (
          <div className="absolute inset-0 flex min-w-0 flex-col justify-end p-4 sm:p-6">
            {children}
          </div>
        ) : null}
      </div>

      {showCredit ? (
        <figcaption className="mt-2 text-xs text-muted-foreground">
          <UnsplashCredit name={name} />
        </figcaption>
      ) : null}
    </figure>
  )
}

/**
 * The bare "Photo by {photographer} on Unsplash" credit for one photo, with the
 * photographer name linking to their profile and "Unsplash" linking to the
 * photo page. Used inline by {@link UnsplashImage} and reusable in a
 * consolidated credit line for decorative placements.
 *
 * @see UnsplashCreditLine - groups multiple credits for decorative placements.
 */
export async function UnsplashCredit({ name }: { name: UnsplashImageName }) {
  const meta = UNSPLASH_IMAGES[name]
  const t = await getTranslations("Imagery")

  // The template wraps each link's text in a tag (`<name>…</name>`,
  // `<unsplash>…</unsplash>`) so the anchors are real <a> elements and the
  // surrounding words stay fully localizable (Hebrew can reorder them). The
  // photographer name is interpolated as a plain value the tag wraps.
  return (
    <span className="break-words">
      {t.rich("credit", {
        photographer: meta.photographer,
        name: (chunks) => (
          <a
            href={meta.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline-offset-2 hover:underline focus-visible:underline"
          >
            {chunks}
          </a>
        ),
        unsplash: (chunks) => (
          <a
            href={meta.unsplashUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-2 hover:underline focus-visible:underline"
          >
            {chunks}
          </a>
        ),
      })}
    </span>
  )
}

/**
 * A consolidated credit line for one or more decorative photos that pass
 * `alt=""`/`showCredit={false}` (e.g. the auth side panel). Renders
 * "Photo by … on Unsplash" for each named photo, comma-joined.
 */
export async function UnsplashCreditLine({
  names,
  className,
}: {
  /** The photos whose attribution to surface together. */
  names: readonly UnsplashImageName[]
  /** Extra classes for the wrapper. */
  className?: string
}) {
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      {names.map((name, i) => (
        <span key={name}>
          {i > 0 ? <span aria-hidden="true">{" · "}</span> : null}
          <UnsplashCredit name={name} />
        </span>
      ))}
    </p>
  )
}
