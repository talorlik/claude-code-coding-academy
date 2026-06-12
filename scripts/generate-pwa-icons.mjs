#!/usr/bin/env node
// Generates placeholder Coding Academy PWA icons: a solid dark square with a
// centered white "CA" monogram, plus a maskable variant whose art sits inside
// the ~80% safe zone so adaptive-icon platforms do not crop it. Re-run with
// `node scripts/generate-pwa-icons.mjs` after changing the design. Real branded
// art can replace the generated PNGs later; the manifest references these paths.
import { mkdir, writeFile } from "node:fs/promises"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

import sharp from "sharp"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const BG = "#0a0a0a"
const FG = "#ffffff"

/**
 * Builds an SVG for the icon. `inset` (0..1) shrinks the text box for the
 * maskable safe zone; 1 fills the square (standard icons).
 */
function svg(size, inset) {
  const fontSize = Math.round(size * 0.42 * inset)
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
       <rect width="${size}" height="${size}" rx="${Math.round(size * 0.18)}" fill="${BG}"/>
       <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle"
             font-family="Arial, Helvetica, sans-serif" font-weight="700"
             font-size="${fontSize}" fill="${FG}">CA</text>
     </svg>`,
  )
}

async function render(size, inset, outPath) {
  const png = await sharp(svg(size, inset)).png().toBuffer()
  await writeFile(outPath, png)
  console.log("wrote", outPath)
}

async function main() {
  const iconsDir = join(root, "public", "icons")
  await mkdir(iconsDir, { recursive: true })
  await render(192, 1, join(iconsDir, "icon-192.png"))
  await render(512, 1, join(iconsDir, "icon-512.png"))
  // Maskable: art at ~78% so the platform safe-zone crop keeps the monogram.
  await render(512, 0.78, join(iconsDir, "icon-maskable-512.png"))
  await render(180, 1, join(iconsDir, "apple-touch-icon-180.png"))
  // The service worker's push handler references /icon.png (root of public).
  await render(192, 1, join(root, "public", "icon.png"))
  console.log("done")
}

main().catch((err) => {
  console.error("icon generation failed:", err.message ?? err)
  process.exit(1)
})
