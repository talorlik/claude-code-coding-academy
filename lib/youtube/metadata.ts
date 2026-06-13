import "server-only"
/**
 * SERVER-ONLY YouTube metadata helpers.
 *
 * This module reads `process.env.YOUTUBE_API_KEY` directly. That variable
 * must NOT carry the `NEXT_PUBLIC_` prefix; doing so would embed the key in
 * the client bundle. Never import this file from a Client Component or any
 * module that is part of a client bundle.
 *
 * The `server-only` import above enforces the server boundary at build time.
 * The absence of a `NEXT_PUBLIC_` prefix on the key is an additional runtime
 * guard.
 */

import { fail, ok } from "@/lib/types/action-result"
import type { ActionResult } from "@/lib/types/action-result"
import { buildWatchUrl, extractVideoId } from "@/lib/youtube/parser"
import type { LessonDraft, VideoMetadata } from "@/lib/youtube/types"

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

/** oEmbed endpoint - no API key required. */
const OEMBED_ENDPOINT = "https://www.youtube.com/oembed"

/** YouTube Data API v3 base URL. */
const YT_API_BASE = "https://www.googleapis.com/youtube/v3"

/** Network request timeout in milliseconds. */
const FETCH_TIMEOUT_MS = 5_000

/** Maximum playlist items to fetch (50 per page, up to 4 pages = 200). */
const MAX_PLAYLIST_ITEMS = 200

/** YouTube Data API page size (API hard cap is 50). */
const PAGE_SIZE = 50

/** YouTube Data API batch size for videos.list id param. */
const VIDEO_BATCH_SIZE = 50

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Performs a `fetch` with an AbortController timeout.
 *
 * Wraps the standard global `fetch` so callers do not repeat the
 * AbortController boilerplate. Throws on timeout or network failure; callers
 * must catch.
 */
async function fetchWithTimeout(
  url: string,
  timeoutMs: number = FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

// ---------------------------------------------------------------------------
// ISO-8601 duration parsing
// ---------------------------------------------------------------------------

/**
 * Converts an ISO-8601 duration string to a total number of seconds.
 *
 * Handles the subset returned by the YouTube Data API:
 * `PT[#H][#M][#S]` where hours, minutes, and seconds are each optional.
 * Examples: `PT1H2M3S` -> 3723, `PT45S` -> 45, `PT10M` -> 600,
 * `P0D` -> 0 (zero-length / live streams).
 *
 * Returns `0` for any string that does not match the expected pattern rather
 * than throwing, so callers can safely use the result without branching.
 *
 * @param duration - ISO-8601 duration string (e.g. `"PT1H30M"`).
 * @returns Total seconds as a non-negative integer.
 */
export function iso8601DurationToSeconds(duration: string): number {
  // Match optional hours, minutes, and seconds components after the PT prefix.
  // P0D (zero-duration) has no T component; return 0 for that case.
  const match = /^P(?:\d+D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(
    duration
  )
  if (!match) return 0

  const hours = parseInt(match[1] ?? "0", 10)
  const minutes = parseInt(match[2] ?? "0", 10)
  const seconds = parseInt(match[3] ?? "0", 10)

  return hours * 3600 + minutes * 60 + seconds
}

// ---------------------------------------------------------------------------
// oEmbed - no API key required
// ---------------------------------------------------------------------------

/**
 * Fetches basic video metadata from YouTube's oEmbed endpoint.
 *
 * oEmbed requires no API key and works for any public video. It returns the
 * video title, author name, and thumbnail URL but NOT duration (YouTube's
 * oEmbed spec omits it). The `durationSeconds` field on the returned
 * {@link VideoMetadata} is therefore always `undefined`.
 *
 * Error cases:
 * - `404` or `401` from oEmbed: video is private, deleted, or unavailable.
 * - Network / JSON parse error: transient failure or bad URL.
 * - Timeout (5 s): fetch took too long.
 *
 * @param urlOrVideoId - A full YouTube watch URL or an 11-char video id.
 * @returns `ActionResult<VideoMetadata>` - `ok` on success, `fail` otherwise.
 */
export async function fetchVideoOEmbed(
  urlOrVideoId: string
): Promise<ActionResult<VideoMetadata>> {
  // Normalise: accept either a full URL or a bare video id.
  let videoId: string | null
  let watchUrl: string

  if (urlOrVideoId.length === 11 && /^[A-Za-z0-9_-]{11}$/.test(urlOrVideoId)) {
    videoId = urlOrVideoId
    watchUrl = buildWatchUrl(videoId)
  } else {
    videoId = extractVideoId(urlOrVideoId)
    if (!videoId) {
      return fail<VideoMetadata>(
        "Invalid YouTube URL: could not extract a valid video id."
      )
    }
    watchUrl = buildWatchUrl(videoId)
  }

  const oEmbedUrl =
    `${OEMBED_ENDPOINT}?url=${encodeURIComponent(watchUrl)}&format=json`

  let response: Response
  try {
    response = await fetchWithTimeout(oEmbedUrl)
  } catch (err) {
    // Check .name directly: DOMException from AbortController may not pass
    // instanceof Error in all test environments (e.g. jsdom).
    const isAbort =
      (err instanceof Error || err instanceof DOMException) &&
      (err as { name?: string }).name === "AbortError"
    const message = isAbort
      ? "YouTube oEmbed request timed out."
      : "Network error fetching YouTube oEmbed metadata."
    return fail<VideoMetadata>(message)
  }

  if (response.status === 404 || response.status === 401) {
    return fail<VideoMetadata>(
      "Video is unavailable: it may be private, deleted, or age-restricted."
    )
  }

  if (!response.ok) {
    return fail<VideoMetadata>(
      `YouTube oEmbed returned an unexpected status: ${response.status}.`
    )
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    return fail<VideoMetadata>("Failed to parse YouTube oEmbed response as JSON.")
  }

  // Basic structural validation - oEmbed responses always include these fields.
  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as Record<string, unknown>)["title"] !== "string" ||
    typeof (body as Record<string, unknown>)["thumbnail_url"] !== "string"
  ) {
    return fail<VideoMetadata>(
      "Unexpected YouTube oEmbed response shape: missing title or thumbnail_url."
    )
  }

  const raw = body as Record<string, unknown>

  const metadata: VideoMetadata = {
    videoId,
    url: watchUrl,
    title: raw["title"] as string,
    thumbnailUrl: raw["thumbnail_url"] as string,
    authorName:
      typeof raw["author_name"] === "string"
        ? (raw["author_name"] as string)
        : undefined,
    // durationSeconds intentionally omitted: oEmbed does not return duration.
  }

  return ok(metadata)
}

// ---------------------------------------------------------------------------
// Playlist import - requires YOUTUBE_API_KEY
// ---------------------------------------------------------------------------

/**
 * Exact user-facing error message returned when `YOUTUBE_API_KEY` is absent.
 * Exported so test assertions can reference the canonical string without
 * duplicating it.
 */
export const MISSING_API_KEY_MESSAGE =
  "Playlist import requires a server-side YOUTUBE_API_KEY. " +
  "Add the key to your .env.local file and restart the server."

/**
 * Fetches all items in a YouTube playlist and returns them as lesson drafts.
 *
 * Requires `process.env.YOUTUBE_API_KEY` to be set. If the key is absent,
 * returns `fail` with {@link MISSING_API_KEY_MESSAGE} so the caller can
 * display a clear instruction to the user.
 *
 * Behaviour:
 * - Paginates via `pageToken` until all items are fetched or
 *   {@link MAX_PLAYLIST_ITEMS} (200) is reached.
 * - After fetching playlist items, attempts to enrich each draft with
 *   `durationSeconds` by calling `videos.list?part=contentDetails` in batches
 *   of 50. If that call fails the drafts are returned without duration rather
 *   than failing the whole import.
 * - `sortOrder` is sequential from 0 in the playlist display order.
 * - Videos that have been deleted from the playlist (no snippet.resourceId)
 *   are silently skipped.
 *
 * Error cases:
 * - Missing API key -> `fail(MISSING_API_KEY_MESSAGE)`.
 * - `403` from the API -> quota exceeded or invalid key.
 * - `404` from the API -> playlist not found or private.
 * - Network / JSON parse errors -> `fail` with a descriptive message.
 *
 * @param playlistId - A YouTube playlist ID (e.g. `PLrAXtmErZgOeiKm4sgNOknc9TTnpFbUAJ`).
 * @returns `ActionResult<LessonDraft[]>` - ordered drafts on success.
 */
export async function fetchPlaylistItems(
  playlistId: string
): Promise<ActionResult<LessonDraft[]>> {
  const apiKey = process.env["YOUTUBE_API_KEY"]
  if (!apiKey) {
    return fail<LessonDraft[]>(MISSING_API_KEY_MESSAGE)
  }

  // -------------------------------------------------------------------------
  // Step 1: Collect all playlist item snippets with pagination.
  // -------------------------------------------------------------------------

  interface PlaylistItemSnippet {
    title: string
    description: string
    thumbnails: {
      high?: { url: string }
      medium?: { url: string }
      default?: { url: string }
    }
    resourceId: { videoId: string }
    position: number
  }

  interface PlaylistItemsResponse {
    nextPageToken?: string
    items: Array<{ snippet: PlaylistItemSnippet }>
  }

  const rawItems: PlaylistItemSnippet[] = []
  let pageToken: string | undefined = undefined

  while (rawItems.length < MAX_PLAYLIST_ITEMS) {
    const params = new URLSearchParams({
      part: "snippet",
      playlistId,
      maxResults: String(PAGE_SIZE),
      key: apiKey,
    })
    if (pageToken) params.set("pageToken", pageToken)

    const url = `${YT_API_BASE}/playlistItems?${params.toString()}`

    let response: Response
    try {
      response = await fetchWithTimeout(url)
    } catch (err) {
      const isAbort =
        (err instanceof Error || err instanceof DOMException) &&
        (err as { name?: string }).name === "AbortError"
      const message = isAbort
        ? "YouTube API request timed out while fetching playlist items."
        : "Network error fetching YouTube playlist items."
      return fail<LessonDraft[]>(message)
    }

    if (response.status === 403) {
      return fail<LessonDraft[]>(
        "YouTube API returned 403: quota exceeded or invalid API key."
      )
    }
    if (response.status === 404) {
      return fail<LessonDraft[]>(
        "Playlist not found: it may be private or the ID is incorrect."
      )
    }
    if (!response.ok) {
      return fail<LessonDraft[]>(
        `YouTube API returned an unexpected status: ${response.status}.`
      )
    }

    let page: PlaylistItemsResponse
    try {
      page = (await response.json()) as PlaylistItemsResponse
    } catch {
      return fail<LessonDraft[]>(
        "Failed to parse YouTube playlist items response as JSON."
      )
    }

    for (const item of page.items) {
      if (!item.snippet?.resourceId?.videoId) continue
      rawItems.push(item.snippet)
      if (rawItems.length >= MAX_PLAYLIST_ITEMS) break
    }

    if (!page.nextPageToken) break
    pageToken = page.nextPageToken
  }

  // -------------------------------------------------------------------------
  // Step 2: Build initial drafts from snippet data.
  // -------------------------------------------------------------------------

  const drafts: LessonDraft[] = rawItems.map((snippet, idx) => {
    const vid = snippet.resourceId.videoId
    const thumb =
      snippet.thumbnails.high?.url ??
      snippet.thumbnails.medium?.url ??
      snippet.thumbnails.default?.url ??
      `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`

    return {
      youtubeVideoId: vid,
      youtubeUrl: buildWatchUrl(vid),
      title: snippet.title,
      description: snippet.description || undefined,
      thumbnailUrl: thumb,
      sortOrder: idx,
    }
  })

  if (drafts.length === 0) {
    return ok(drafts)
  }

  // -------------------------------------------------------------------------
  // Step 3: Enrich with duration via videos.list (best-effort; non-fatal).
  // -------------------------------------------------------------------------

  const durationMap = new Map<string, number>()

  const videoIds = drafts.map((d) => d.youtubeVideoId)
  const batches: string[][] = []
  for (let i = 0; i < videoIds.length; i += VIDEO_BATCH_SIZE) {
    batches.push(videoIds.slice(i, i + VIDEO_BATCH_SIZE))
  }

  try {
    for (const batch of batches) {
      const params = new URLSearchParams({
        part: "contentDetails",
        id: batch.join(","),
        key: apiKey,
      })
      const url = `${YT_API_BASE}/videos?${params.toString()}`

      let response: Response
      try {
        response = await fetchWithTimeout(url)
      } catch {
        // Transient network failure - skip duration enrichment for this batch.
        break
      }

      if (!response.ok) {
        // Non-fatal: continue without duration for remaining batches.
        break
      }

      interface VideosResponse {
        items: Array<{
          id: string
          contentDetails: { duration: string }
        }>
      }

      let page: VideosResponse
      try {
        page = (await response.json()) as VideosResponse
      } catch {
        break
      }

      for (const item of page.items) {
        const seconds = iso8601DurationToSeconds(item.contentDetails.duration)
        durationMap.set(item.id, seconds)
      }
    }
  } catch {
    // Any unexpected error in the enrichment step is swallowed so the
    // drafts array is still returned without duration data.
  }

  // Apply enriched durations where available.
  if (durationMap.size > 0) {
    for (const draft of drafts) {
      const seconds = durationMap.get(draft.youtubeVideoId)
      if (seconds !== undefined) {
        draft.durationSeconds = seconds
      }
    }
  }

  return ok(drafts)
}
