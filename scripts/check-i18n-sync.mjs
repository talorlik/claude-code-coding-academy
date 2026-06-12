#!/usr/bin/env node
// Fails the build if the en-US and he-IL message catalogs do not have an
// identical set of (dotted) key paths. This is the enforcement mechanism that
// keeps localization complete as the app grows: every key added to one catalog
// must be added to the other. Leaf type mismatches (object vs string) are also
// reported, since they mean the catalogs diverged structurally.

import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

const here = dirname(fileURLToPath(import.meta.url))
const messagesDir = join(here, "..", "messages")

/** The two catalogs that must stay in lockstep. */
const CATALOGS = ["en-US.json", "he-IL.json"]

/**
 * Collects every leaf key path in an object as a dotted string
 * (e.g. `Common.error.title`). Objects recurse; everything else is a leaf.
 */
function collectKeyPaths(value, prefix, out) {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    for (const key of Object.keys(value)) {
      const next = prefix ? `${prefix}.${key}` : key
      collectKeyPaths(value[key], next, out)
    }
  } else {
    out.add(prefix)
  }
  return out
}

function load(file) {
  const raw = readFileSync(join(messagesDir, file), "utf8")
  return JSON.parse(raw)
}

const [enFile, heFile] = CATALOGS
const enKeys = collectKeyPaths(load(enFile), "", new Set())
const heKeys = collectKeyPaths(load(heFile), "", new Set())

const missingInHe = [...enKeys].filter((k) => !heKeys.has(k)).sort()
const missingInEn = [...heKeys].filter((k) => !enKeys.has(k)).sort()

if (missingInHe.length === 0 && missingInEn.length === 0) {
  console.log(`i18n catalogs in sync (${enKeys.size} keys).`)
  process.exit(0)
}

if (missingInHe.length > 0) {
  console.error(`Keys in ${enFile} but missing from ${heFile}:`)
  for (const k of missingInHe) console.error(`  - ${k}`)
}
if (missingInEn.length > 0) {
  console.error(`Keys in ${heFile} but missing from ${enFile}:`)
  for (const k of missingInEn) console.error(`  - ${k}`)
}
process.exit(1)
