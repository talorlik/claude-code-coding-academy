#!/usr/bin/env node
// Generates the Coding Academy PWA / touch icons from the real brand mark.
// The source is the theme-dark brand logo (docs/design/logo_dark.png), which
// already sits on a DESIGN.md cosmic-void backdrop (#03041d). It is fitted,
// centered, onto a rounded #06051d canvas (DESIGN.md --color-bg dark) so the
// logo's own backdrop blends seamlessly into the icon canvas. The maskable
// variant keeps the art inside the ~78% adaptive-icon safe zone so platforms
// that crop a circle/squircle do not clip the mark. Re-run with
// `node scripts/generate-pwa-icons.mjs` after the brand art changes; the
// manifest and layout reference these output paths.
import { mkdir, writeFile } from "node:fs/promises"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

import sharp from "sharp"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")

// The dark brand logo's own backdrop is #03041d (DESIGN.md cosmic-void family).
// The icon canvas matches it exactly so the fitted logo blends with zero seam,
// rather than showing a faint bounding box against a slightly different navy.
const BG = { r: 0x03, g: 0x04, b: 0x1d, alpha: 1 }
const LOGO_SRC = join(root, "docs", "design", "logo_dark.png")

/**
 * Builds a rounded-rect alpha mask SVG for `size`, matching the icon corner
 * radius. Applied with `dest-in` so the composed square gets rounded corners.
 */
function maskSvg(size) {
  const r = Math.round(size * 0.18)
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
       <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="#fff"/>
     </svg>`,
  )
}

/**
 * Renders one icon: fit the brand logo to `inset` of the square, center it on
 * the cosmic-void canvas, then round the corners. `inset` (0..1) leaves the
 * adaptive-icon safe-zone margin for maskable variants; 1 fills the square.
 */
async function render(size, inset, outPath, { rounded = true } = {}) {
  const art = Math.round(size * inset)
  const logo = await sharp(LOGO_SRC)
    .resize(art, art, { fit: "contain", background: BG })
    .toBuffer()

  let img = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  }).composite([{ input: logo, gravity: "centre" }])

  if (rounded) {
    img = sharp(await img.png().toBuffer()).composite([
      { input: maskSvg(size), blend: "dest-in" },
    ])
  }

  const png = await img.png().toBuffer()
  await writeFile(outPath, png)
  console.log("wrote", outPath)
}

async function main() {
  const iconsDir = join(root, "public", "icons")
  await mkdir(iconsDir, { recursive: true })
  await render(192, 0.84, join(iconsDir, "icon-192.png"))
  await render(512, 0.84, join(iconsDir, "icon-512.png"))
  // Maskable: art at ~78% so the platform safe-zone crop keeps the mark. The
  // canvas stays full-bleed (no rounding) because the platform applies its own
  // mask shape to maskable icons.
  await render(512, 0.78, join(iconsDir, "icon-maskable-512.png"), {
    rounded: false,
  })
  await render(180, 0.84, join(iconsDir, "apple-touch-icon-180.png"))
  // The service worker's push handler references /icon.png (root of public).
  await render(192, 0.84, join(root, "public", "icon.png"))
  console.log("done")
}

main().catch((err) => {
  console.error("icon generation failed:", err.message ?? err)
  process.exit(1)
})
