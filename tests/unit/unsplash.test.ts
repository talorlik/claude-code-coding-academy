/**
 * Unit tests for the Batch 23 Unsplash imagery layer:
 *
 * - the deterministic cover-fallback selector is stable (same course key always
 *   maps to the same cover-eligible photo) and only ever returns a photo from
 *   the cover-eligible set;
 * - every photo in the attribution map carries complete attribution and an
 *   `altKey` that exists in BOTH message catalogs (so no rendered photo can lack
 *   a localized alt or a credit);
 * - the committed JPEG each map entry points at exists on disk (the self-hosted,
 *   offline/PWA-safe guarantee).
 *
 * These are pure-data assertions - no React rendering - so they run without a
 * request context. The "a real coverImageUrl wins over the fallback" behavior is
 * covered by the course-card render test and the e2e suite.
 */

import { existsSync } from "node:fs"
import { join } from "node:path"

import { describe, it, expect } from "vitest"

import enMessages from "@/messages/en-US.json"
import heMessages from "@/messages/he-IL.json"
import {
  UNSPLASH_IMAGES,
  COVER_FALLBACK_IMAGES,
  pickCoverFallbackImage,
  type UnsplashImageName,
} from "@/lib/images/unsplash"

/** Repo root: tests run from the project directory, so cwd is the root. */
const ROOT = process.cwd()

/** Reads a dotted key path out of a parsed catalog, or undefined if absent. */
function readKey(catalog: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (node, key) =>
        node && typeof node === "object"
          ? (node as Record<string, unknown>)[key]
          : undefined,
      catalog,
    )
}

const ALL_NAMES = Object.keys(UNSPLASH_IMAGES) as UnsplashImageName[]

describe("pickCoverFallbackImage", () => {
  it("is deterministic: the same key always yields the same photo", () => {
    for (const key of ["course-a", "11111111-2222-3333", "abc", ""]) {
      const first = pickCoverFallbackImage(key)
      expect(pickCoverFallbackImage(key)).toBe(first)
      // A handful of repeats to rule out any hidden state.
      expect(pickCoverFallbackImage(key)).toBe(first)
    }
  })

  it("only ever returns a cover-eligible photo", () => {
    for (let i = 0; i < 200; i++) {
      const name = pickCoverFallbackImage(`course-${i}`)
      expect(COVER_FALLBACK_IMAGES).toContain(name)
    }
  })

  it("distributes across more than one photo (not a constant)", () => {
    const seen = new Set<UnsplashImageName>()
    for (let i = 0; i < 200; i++) seen.add(pickCoverFallbackImage(`course-${i}`))
    expect(seen.size).toBeGreaterThan(1)
  })

  it("every cover-eligible name is a real map entry", () => {
    for (const name of COVER_FALLBACK_IMAGES) {
      expect(UNSPLASH_IMAGES[name]).toBeDefined()
    }
  })
})

describe("UNSPLASH_IMAGES attribution map", () => {
  it("gives every photo complete attribution fields", () => {
    for (const name of ALL_NAMES) {
      const meta = UNSPLASH_IMAGES[name]
      expect(meta.src, `${name}.src`).toMatch(/^\/images\/unsplash\/.+\.jpg$/)
      expect(meta.photographer, `${name}.photographer`).toBeTruthy()
      expect(meta.profileUrl, `${name}.profileUrl`).toMatch(
        /^https:\/\/unsplash\.com\/@/,
      )
      expect(meta.unsplashUrl, `${name}.unsplashUrl`).toMatch(
        /^https:\/\/unsplash\.com\/photos\/.+/,
      )
      expect(meta.altKey, `${name}.altKey`).toBeTruthy()
    }
  })

  it("resolves every altKey in BOTH catalogs", () => {
    for (const name of ALL_NAMES) {
      const { altKey } = UNSPLASH_IMAGES[name]
      const en = readKey(enMessages, `Imagery.alt.${altKey}`)
      const he = readKey(heMessages, `Imagery.alt.${altKey}`)
      expect(typeof en, `EN Imagery.alt.${altKey}`).toBe("string")
      expect((en as string).length, `EN Imagery.alt.${altKey}`).toBeGreaterThan(0)
      expect(typeof he, `HE Imagery.alt.${altKey}`).toBe("string")
      expect((he as string).length, `HE Imagery.alt.${altKey}`).toBeGreaterThan(0)
    }
  })

  it("defines the credit template in BOTH catalogs with both link tags", () => {
    for (const [label, catalog] of [
      ["EN", enMessages],
      ["HE", heMessages],
    ] as const) {
      const credit = readKey(catalog, "Imagery.credit")
      expect(typeof credit, `${label} Imagery.credit`).toBe("string")
      // Both link slots must be present so the photographer profile and the
      // Unsplash page both become real anchors.
      expect(credit as string, `${label} credit <name>`).toContain("<name>")
      expect(credit as string, `${label} credit <unsplash>`).toContain(
        "<unsplash>",
      )
    }
  })

  it("points every entry at a committed JPEG that exists on disk", () => {
    for (const name of ALL_NAMES) {
      const { src } = UNSPLASH_IMAGES[name]
      const onDisk = join(ROOT, "public", src.replace(/^\//, ""))
      expect(existsSync(onDisk), `${name} -> ${src} should exist`).toBe(true)
    }
  })
})
