/**
 * OPT-IN live test for YouTube Data API v3.
 *
 * This file is part of the standard Vitest suite (`tests/**\/*.test.ts`) but
 * every test inside is skipped by default so `npm run test` never hits the
 * real YouTube API. The tests only run when the environment variable
 * `YOUTUBE_LIVE_TEST=true` is set AND `YOUTUBE_API_KEY` is present.
 *
 * How to run locally:
 *
 *   YOUTUBE_LIVE_TEST=true \
 *   YOUTUBE_API_KEY=<your-key> \
 *   PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH" \
 *   npm run test -- tests/integration/youtube-live.test.ts
 *
 * The test targets a stable public playlist used by Google to demonstrate
 * the YouTube Data API (the "Google Developers" channel demo playlist). If
 * that playlist is ever removed, substitute any other stable public playlist
 * and update the constant below.
 *
 * IMPORTANT: Do NOT remove the `if (!enabled)` guard or change `it.skip` to
 * `it` at the top level. The default `npm run test` run must stay fully
 * offline and deterministic.
 */

import { describe, it, expect } from "vitest"
import type { LessonDraft } from "@/lib/youtube/types"

// ---------------------------------------------------------------------------
// Opt-in guard
// ---------------------------------------------------------------------------

const enabled =
  process.env["YOUTUBE_LIVE_TEST"] === "true" &&
  Boolean(process.env["YOUTUBE_API_KEY"])

// A stable, public educational YouTube playlist with several videos and
// real durations (Traversy Media crash courses). Verified live on
// 2026-06-14: 65 items, first "HTML Crash Course For Absolute Beginners".
// If this playlist is ever removed, substitute any other stable public
// playlist and update the constant below.
const STABLE_PLAYLIST_URL =
  "https://www.youtube.com/playlist?list=PLillGF-RfqbZTASqIqdvm1R5mLrQq79CU"

// ---------------------------------------------------------------------------
// Live tests (all skipped unless YOUTUBE_LIVE_TEST=true + key present)
// ---------------------------------------------------------------------------

describe("YouTube live API (opt-in: YOUTUBE_LIVE_TEST=true)", () => {
  it.skipIf(!enabled)(
    "fetchPlaylistItems returns >=1 LessonDraft with a videoId",
    async () => {
      // Import the real module - no mocks in this file.
      // The `server-only` import is aliased to a no-op in vitest.config.ts
      // so server modules are importable in the test environment.
      const { fetchPlaylistItems } = await import("@/lib/youtube/metadata")

      const result = await fetchPlaylistItems(
        // Extract the list= param manually to pass just the ID.
        new URL(STABLE_PLAYLIST_URL).searchParams.get("list") ?? ""
      )

      expect(result.ok).toBe(true)
      if (!result.ok) {
        // Surface the error message for easier debugging.
        throw new Error(`fetchPlaylistItems failed: ${result.message}`)
      }

      const drafts: LessonDraft[] = result.data
      expect(drafts.length).toBeGreaterThanOrEqual(1)

      const first = drafts[0]
      expect(first.youtubeVideoId).toBeTruthy()
      expect(first.youtubeVideoId.length).toBe(11)
      expect(first.youtubeUrl).toContain(first.youtubeVideoId)
      expect(first.title).toBeTruthy()
      expect(first.sortOrder).toBe(0)
    }
  )

  it.skipIf(!enabled)(
    "fetchPlaylistItems returns durationSeconds > 0 for at least one item",
    async () => {
      const { fetchPlaylistItems } = await import("@/lib/youtube/metadata")

      const result = await fetchPlaylistItems(
        new URL(STABLE_PLAYLIST_URL).searchParams.get("list") ?? ""
      )
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const withDuration = result.data.filter(
        (d) => d.durationSeconds !== undefined && d.durationSeconds > 0
      )
      expect(withDuration.length).toBeGreaterThanOrEqual(1)
    }
  )
})
