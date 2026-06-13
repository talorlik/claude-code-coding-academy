/**
 * Pure YouTube URL parser - no network calls, no environment access.
 *
 * All functions are safe to import from client code. The module intentionally
 * avoids any `process.env` access and makes no fetch calls so it remains
 * fully unit-testable without mocking.
 *
 * ## Supported hosts
 *
 * The following hostname variants are all treated as YouTube:
 * - `www.youtube.com`, `youtube.com`
 * - `m.youtube.com` (mobile)
 * - `music.youtube.com`
 * - `youtu.be` (short links)
 *
 * Both `http://` and `https://` are accepted. Protocol-relative URLs
 * (`//youtube.com/...`) are rejected because the WHATWG URL constructor
 * requires a scheme; callers should normalise to `https:` first if needed.
 *
 * ## Bare IDs
 *
 * Bare 11-character strings (no URL) are rejected. This parser requires a
 * full URL so it can verify the host is a YouTube domain and avoid false
 * positives against arbitrary 11-char strings.
 *
 * ## Video ID shape
 *
 * YouTube video IDs are exactly 11 characters from `[A-Za-z0-9_-]`.
 * Anything shorter, longer, or containing other characters is rejected.
 *
 * ## Playlist ID shape
 *
 * YouTube playlist IDs come in several prefixed forms:
 * - `PL` - user/channel playlists (most common, length varies 34-36 chars)
 * - `UU` - uploads for a channel
 * - `LL` - liked videos
 * - `FL` - favourites
 * - `RD` - mixes/radio
 * - `OL` - official playlists
 *
 * The regex chosen is: `/^[A-Za-z0-9_-]{13,}$/`. This accepts all current
 * known ID formats (minimum observed length is 13 for some RD/ mixes) and
 * rejects short garbage values. The upper bound is intentionally absent
 * because YouTube has lengthened IDs historically.
 */

import type { ParsedYouTubeUrl } from "@/lib/youtube/types"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Exact video id character set and length (YouTube spec). */
const VIDEO_ID_REGEX = /^[A-Za-z0-9_-]{11}$/

/**
 * Playlist id: known prefix families + alphanumeric body, 13 chars minimum.
 * See module-level documentation for the rationale.
 */
const PLAYLIST_ID_REGEX = /^[A-Za-z0-9_-]{13,}$/

/** All hostname variants that belong to YouTube. */
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
])

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Safely parses a URL string using the WHATWG URL constructor.
 *
 * Returns `null` on any parse error instead of throwing. This makes every
 * caller safe to use without a try/catch.
 */
function parseUrl(raw: string): URL | null {
  try {
    return new URL(raw)
  } catch {
    return null
  }
}

/**
 * Returns `true` when `hostname` belongs to the YouTube domain family.
 */
function isYouTubeHost(hostname: string): boolean {
  return YOUTUBE_HOSTS.has(hostname)
}

/**
 * Validates an extracted video id against the canonical 11-char shape.
 *
 * Returns `null` when the id is absent or malformed so callers can safely
 * propagate the null without branching on the validation logic.
 */
function validateVideoId(id: string | null | undefined): string | null {
  if (!id) return null
  return VIDEO_ID_REGEX.test(id) ? id : null
}

/**
 * Validates an extracted playlist id against the canonical shape.
 */
function validatePlaylistId(id: string | null | undefined): string | null {
  if (!id) return null
  return PLAYLIST_ID_REGEX.test(id) ? id : null
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Extracts a YouTube video ID from any recognised YouTube URL form.
 *
 * Supported path patterns (all require a recognised YouTube host):
 * - `youtube.com/watch?v=<id>` - standard watch URL
 * - `youtu.be/<id>` - short link
 * - `youtube.com/embed/<id>` - embed URL
 * - `youtube.com/shorts/<id>` - Shorts URL
 * - `youtube.com/v/<id>` - legacy player URL
 *
 * Extra query parameters are ignored. The function returns `null` for:
 * - Non-YouTube hosts
 * - Malformed URLs (WHATWG URL constructor failure)
 * - Video IDs that fail the 11-char `[A-Za-z0-9_-]` validation
 *
 * @param url - A full URL string (http or https scheme required).
 * @returns The 11-character video ID, or `null` if extraction fails.
 */
export function extractVideoId(url: string): string | null {
  const parsed = parseUrl(url)
  if (!parsed || !isYouTubeHost(parsed.hostname)) return null

  const { pathname, searchParams } = parsed

  // youtu.be/<id>
  if (parsed.hostname === "youtu.be") {
    const id = pathname.slice(1).split("/")[0]
    return validateVideoId(id ?? null)
  }

  // /watch?v=<id>
  if (pathname === "/watch" || pathname.startsWith("/watch?")) {
    return validateVideoId(searchParams.get("v"))
  }

  // /embed/<id>
  if (pathname.startsWith("/embed/")) {
    const id = pathname.slice("/embed/".length).split("/")[0]
    return validateVideoId(id ?? null)
  }

  // /shorts/<id>
  if (pathname.startsWith("/shorts/")) {
    const id = pathname.slice("/shorts/".length).split("/")[0]
    return validateVideoId(id ?? null)
  }

  // /v/<id>  (legacy)
  if (pathname.startsWith("/v/")) {
    const id = pathname.slice("/v/".length).split("/")[0]
    return validateVideoId(id ?? null)
  }

  return null
}

/**
 * Extracts a YouTube playlist ID from a URL.
 *
 * Supported patterns:
 * - `youtube.com/playlist?list=<id>` - playlist browse page
 * - `youtube.com/watch?v=<videoId>&list=<id>` - video inside a playlist
 *
 * The playlist id must match `/^[A-Za-z0-9_-]{13,}$/`. Returns `null` for
 * non-YouTube hosts, malformed URLs, or ids that fail validation.
 *
 * @param url - A full URL string (http or https scheme required).
 * @returns The playlist ID string, or `null` if extraction fails.
 */
export function extractPlaylistId(url: string): string | null {
  const parsed = parseUrl(url)
  if (!parsed || !isYouTubeHost(parsed.hostname)) return null

  // youtu.be carries video ids only; no playlist page exists there.
  // Watch URLs carrying &list= are handled via searchParams below.
  return validatePlaylistId(parsed.searchParams.get("list"))
}

/**
 * Parses a YouTube URL and returns the kind of resource it points to,
 * along with any extracted video or playlist IDs.
 *
 * Precedence rule: a URL that carries both a video id and a playlist id
 * (e.g. `watch?v=ID&list=PL...`) returns `kind: "video"` and populates
 * both `videoId` and `playlistId`. A URL with only a playlist id
 * (e.g. `/playlist?list=PL...`) returns `kind: "playlist"`.
 *
 * @param url - A full URL string (http or https scheme required).
 * @returns A {@link ParsedYouTubeUrl} describing the resource.
 */
export function parseYouTubeUrl(url: string): ParsedYouTubeUrl {
  const videoId = extractVideoId(url) ?? undefined
  const playlistId = extractPlaylistId(url) ?? undefined

  if (videoId) {
    return { kind: "video", videoId, playlistId }
  }
  if (playlistId) {
    return { kind: "playlist", playlistId }
  }
  return { kind: "unknown" }
}

/**
 * Returns `true` when the URL belongs to a recognised YouTube domain.
 *
 * This is a host-only check; it does not validate that the URL contains a
 * usable video or playlist id. Use `extractVideoId` or `extractPlaylistId`
 * for that.
 *
 * @param url - A full URL string (http or https scheme required).
 * @returns `true` if the URL's hostname is a YouTube domain, `false` otherwise.
 */
export function isYouTubeUrl(url: string): boolean {
  const parsed = parseUrl(url)
  return parsed !== null && isYouTubeHost(parsed.hostname)
}

/**
 * Builds the canonical YouTube watch URL for a video id.
 *
 * Does not validate the video id. Callers are responsible for passing a
 * valid 11-character id (e.g. one returned by {@link extractVideoId}).
 *
 * @param videoId - An 11-character YouTube video id.
 * @returns The full watch URL: `https://www.youtube.com/watch?v=<videoId>`.
 */
export function buildWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`
}

/**
 * Builds the `hqdefault` thumbnail URL for a video id.
 *
 * YouTube serves several thumbnail resolutions; `hqdefault` (480x360) is
 * the best reliably-available size without the API. For higher resolutions
 * (`maxresdefault`, `sddefault`) availability depends on the video.
 *
 * Does not validate the video id.
 *
 * @param videoId - An 11-character YouTube video id.
 * @returns The thumbnail URL: `https://i.ytimg.com/vi/<videoId>/hqdefault.jpg`.
 */
export function buildThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
}
