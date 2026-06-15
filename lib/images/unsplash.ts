/**
 * Single source of truth for the curated, self-hosted Unsplash coding photos
 * used across the app (Batch 23). Each entry pairs the local public path with
 * the photographer attribution that Unsplash's guidelines require wherever the
 * photo is shown, plus an `altKey` into the `Imagery` i18n namespace so alt text
 * stays localized in both catalogs.
 *
 * The photos themselves are downloaded by `scripts/fetch-unsplash-images.mjs`
 * and committed under `public/images/unsplash/`; nothing here hotlinks the
 * Unsplash CDN at runtime. The `localName` keys here MUST match the filenames
 * that script writes.
 *
 * @see scripts/fetch-unsplash-images.mjs - downloads the bytes this map points at.
 * @see components/unsplash-image.tsx - renders an entry with frame + attribution.
 */

/** The stable identifier for each curated photo (its local filename stem). */
export type UnsplashImageName =
  | "code-monitor"
  | "html-lines"
  | "screen-code"
  | "monitor-code"
  | "laptop-colorcode"
  | "macbook-code"
  | "matrix-code"

/**
 * Attribution + source metadata for one curated photo. `src` is a public-root
 * path (served by Next, optimizable by `next/image`); `altKey` indexes the
 * `Imagery` i18n namespace (`Imagery.alt.<altKey>`), present in BOTH catalogs.
 */
export interface UnsplashImageMeta {
  /** Public-root path to the committed JPEG, e.g. `/images/unsplash/code-monitor.jpg`. */
  readonly src: string
  /** Photographer's display name, shown in the credit line. */
  readonly photographer: string
  /** Absolute URL to the photographer's Unsplash profile. */
  readonly profileUrl: string
  /** Absolute URL to the photo's Unsplash page (`https://unsplash.com/photos/<id>`). */
  readonly unsplashUrl: string
  /** Key into the `Imagery.alt` i18n namespace for this photo's localized alt text. */
  readonly altKey: string
}

/**
 * The seven curated free Unsplash coding photos, keyed by {@link UnsplashImageName}.
 * This map is the single attribution authority: every render of a photo pulls
 * its credit from here, and the test suite asserts every entry has complete
 * attribution and an `altKey` present in both message catalogs.
 */
export const UNSPLASH_IMAGES: Record<UnsplashImageName, UnsplashImageMeta> = {
  "code-monitor": {
    src: "/images/unsplash/code-monitor.jpg",
    photographer: "Ilya Pavlov",
    profileUrl: "https://unsplash.com/@ilyapavlov",
    unsplashUrl: "https://unsplash.com/photos/OqtafYT5kTw",
    altKey: "codeMonitor",
  },
  "html-lines": {
    src: "/images/unsplash/html-lines.jpg",
    photographer: "Florian Olivo",
    profileUrl: "https://unsplash.com/@florianolv",
    unsplashUrl: "https://unsplash.com/photos/4hbJ-eymZ1o",
    altKey: "htmlLines",
  },
  "screen-code": {
    src: "/images/unsplash/screen-code.jpg",
    photographer: "Florian Olivo",
    profileUrl: "https://unsplash.com/@florianolv",
    unsplashUrl: "https://unsplash.com/photos/ieic5Tq8YMk",
    altKey: "screenCode",
  },
  "monitor-code": {
    src: "/images/unsplash/monitor-code.jpg",
    photographer: "Mohammad Rahmani",
    profileUrl: "https://unsplash.com/@afgprogrammer",
    unsplashUrl: "https://unsplash.com/photos/LrxSl4ZxoRs",
    altKey: "monitorCode",
  },
  "laptop-colorcode": {
    src: "/images/unsplash/laptop-colorcode.jpg",
    photographer: "Mohammad Rahmani",
    profileUrl: "https://unsplash.com/@afgprogrammer",
    unsplashUrl: "https://unsplash.com/photos/8qEB0fTe9Vw",
    altKey: "laptopColorcode",
  },
  "macbook-code": {
    src: "/images/unsplash/macbook-code.jpg",
    photographer: "Arnold Francisca",
    profileUrl: "https://unsplash.com/@clark_fransa",
    unsplashUrl: "https://unsplash.com/photos/f77Bh3inUpE",
    altKey: "macbookCode",
  },
  "matrix-code": {
    src: "/images/unsplash/matrix-code.jpg",
    photographer: "Markus Spiske",
    profileUrl: "https://unsplash.com/@markusspiske",
    unsplashUrl: "https://unsplash.com/photos/iar-afB0QQw",
    altKey: "matrixCode",
  },
}

/**
 * The photos eligible to back a course card's cover when the course has no
 * `coverImageUrl`. Ordered and stable so {@link pickCoverFallbackImage} can hash
 * a course key into this list deterministically. Excludes the slot-specific
 * photos (course-detail header, auth panel, About, Contact) to keep covers
 * visually distinct from those surfaces.
 */
export const COVER_FALLBACK_IMAGES: readonly UnsplashImageName[] = [
  "code-monitor",
  "html-lines",
  "screen-code",
  "matrix-code",
]

/**
 * Deterministically picks a cover-fallback photo for a course from its stable
 * key (course id or slug). The same key always maps to the same photo, so a
 * course's fallback cover never flickers between renders and is assertable in a
 * unit test. Uses a small FNV-1a-style hash over the key's char codes - no
 * randomness, no time dependence.
 *
 * @param key - A stable per-course identifier (the course id or slug).
 * @returns The chosen {@link UnsplashImageName} from {@link COVER_FALLBACK_IMAGES}.
 */
export function pickCoverFallbackImage(key: string): UnsplashImageName {
  // FNV-1a 32-bit hash, kept positive. Deterministic across runtimes.
  let hash = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i)
    // Multiply by the FNV prime (16777619) via shifts to stay in 32-bit range.
    hash = Math.imul(hash, 0x01000193)
  }
  const index = Math.abs(hash) % COVER_FALLBACK_IMAGES.length
  return COVER_FALLBACK_IMAGES[index]!
}
