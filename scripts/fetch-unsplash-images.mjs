#!/usr/bin/env node
/**
 * Idempotent downloader for the seven curated free Unsplash coding photos
 * (Batch 23). Saves each to `public/images/unsplash/<localName>.jpg` using the
 * `https://unsplash.com/photos/<id>/download?force=true` endpoint, which returns
 * the full-resolution JPEG and (per the Unsplash API guidelines) counts as a
 * download trigger for attribution purposes.
 *
 * The photos are self-hosted: committing them keeps the site offline/PWA-safe
 * and avoids any runtime hotlink to the Unsplash CDN. This script is committed
 * and re-runnable - existing files are skipped, and ANY download failure exits
 * non-zero so a broken fetch fails loudly instead of leaving a partial asset.
 *
 * Run from the repo root: `node scripts/fetch-unsplash-images.mjs`.
 *
 * The attribution metadata (photographer, profile, alt key) is the
 * responsibility of `lib/images/unsplash.ts`; this script only owns the bytes.
 * The two lists must stay in sync - the `localName`/`id` pairs below mirror that
 * map.
 */

import { mkdir, writeFile, access } from "node:fs/promises"
import { constants } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, "..")
const OUT_DIR = join(ROOT, "public", "images", "unsplash")

/**
 * The curated photo set. Each entry pairs the stable local filename with the
 * Unsplash photo id used to build the download URL. Keep in lockstep with the
 * `UNSPLASH_IMAGES` map in `lib/images/unsplash.ts`.
 */
const PHOTOS = [
  { localName: "code-monitor", id: "OqtafYT5kTw" },
  { localName: "html-lines", id: "4hbJ-eymZ1o" },
  { localName: "screen-code", id: "ieic5Tq8YMk" },
  { localName: "monitor-code", id: "LrxSl4ZxoRs" },
  { localName: "laptop-colorcode", id: "8qEB0fTe9Vw" },
  { localName: "macbook-code", id: "f77Bh3inUpE" },
  { localName: "matrix-code", id: "iar-afB0QQw" },
]

/** Resolves true when a path already exists on disk. */
async function exists(path) {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}

/**
 * Downloads one photo to `OUT_DIR/<localName>.jpg`. Throws on any non-2xx
 * response or empty body so the caller can fail the whole run.
 */
async function download({ localName, id }) {
  const dest = join(OUT_DIR, `${localName}.jpg`)

  if (await exists(dest)) {
    console.log(`skip  ${localName}.jpg (already present)`)
    return
  }

  const url = `https://unsplash.com/photos/${id}/download?force=true`
  const res = await fetch(url, { redirect: "follow" })
  if (!res.ok) {
    throw new Error(
      `download failed for ${localName} (${id}): HTTP ${res.status} ${res.statusText}`,
    )
  }

  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.byteLength === 0) {
    throw new Error(`download for ${localName} (${id}) returned an empty body`)
  }

  await writeFile(dest, buf)
  console.log(`saved ${localName}.jpg (${buf.byteLength.toLocaleString()} bytes)`)
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true })

  const failures = []
  for (const photo of PHOTOS) {
    try {
      await download(photo)
    } catch (err) {
      failures.push(err instanceof Error ? err.message : String(err))
    }
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} download(s) failed:`)
    for (const msg of failures) console.error(`  - ${msg}`)
    process.exit(1)
  }

  console.log(`\nAll ${PHOTOS.length} Unsplash photos are present.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
