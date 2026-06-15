/**
 * Verifies the batch-20 brand assets are physically present and that every icon
 * the Web App Manifest advertises resolves to a real file on disk. The manifest
 * route and `metadata.icons` only declare URLs; nothing else guarantees the
 * referenced PNGs/ICO actually exist, so a missing-asset regression (a deleted
 * file, a renamed path, a generator that did not run) would otherwise surface
 * only as a broken icon at runtime. These assertions fail the build instead.
 */

import { existsSync } from "node:fs"
import { join } from "node:path"

import { describe, it, expect } from "vitest"

import { buildManifest } from "@/lib/pwa/manifest"

/** Repo root: tests run from the project directory, so cwd is the root. */
const ROOT = process.cwd()

/** Maps a public-root URL ("/icons/icon-192.png") to its on-disk path. */
function publicPath(url: string): string {
  return join(ROOT, "public", url.replace(/^\//, ""))
}

describe("brand assets", () => {
  it("serves the real favicon from app/favicon.ico", () => {
    expect(existsSync(join(ROOT, "app", "favicon.ico"))).toBe(true)
  })

  it("ships the theme-scoped brand logos and hero banner under public/brand", () => {
    expect(existsSync(join(ROOT, "public", "brand", "logo_light.png"))).toBe(
      true,
    )
    expect(existsSync(join(ROOT, "public", "brand", "logo_dark.png"))).toBe(
      true,
    )
    expect(
      existsSync(join(ROOT, "public", "brand", "header_banner.png")),
    ).toBe(true)
  })

  it("resolves every icon the manifest advertises to a real file", () => {
    const manifest = buildManifest()
    const icons = manifest.icons ?? []
    expect(icons.length).toBeGreaterThan(0)
    for (const icon of icons) {
      expect(icon.src, `manifest icon ${icon.src} should exist`).toBeTruthy()
      expect(
        existsSync(publicPath(icon.src)),
        `manifest icon ${icon.src} should resolve on disk`,
      ).toBe(true)
    }
  })

  it("resolves the Apple touch icon wired via metadata.icons", () => {
    // app/[locale]/layout.tsx declares `icons.apple` as this path.
    expect(
      existsSync(publicPath("/icons/apple-touch-icon-180.png")),
    ).toBe(true)
  })
})
