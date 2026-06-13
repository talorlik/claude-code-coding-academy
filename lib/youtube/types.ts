/**
 * Shared types for the YouTube parser and metadata modules.
 *
 * These types are importable from both client and server code; they carry no
 * secrets and contain no network logic. The metadata helpers that produce
 * these types live in `lib/youtube/metadata.ts` (server-only).
 */

// ---------------------------------------------------------------------------
// Parse result
// ---------------------------------------------------------------------------

/**
 * Result of parsing a YouTube URL. A single watch URL may carry both a
 * video id and a playlist id (e.g. `youtube.com/watch?v=ID&list=PL...`).
 *
 * Precedence rule: if a video id is present, `kind` is `"video"` regardless
 * of whether a playlist id is also present. `playlistId` is always populated
 * when a valid list param is found. A URL that has only a playlist id (e.g.
 * `youtube.com/playlist?list=PL...`) yields `kind: "playlist"`.
 */
export interface ParsedYouTubeUrl {
  /** Discriminant for the primary resource identified in the URL. */
  kind: "video" | "playlist" | "unknown"
  /** 11-character video id, present when a valid video id was found. */
  videoId?: string
  /** Playlist id, present when a valid playlist id was found in the URL. */
  playlistId?: string
}

// ---------------------------------------------------------------------------
// Metadata types (produced by the server-only metadata helpers)
// ---------------------------------------------------------------------------

/**
 * Video metadata returned by the oEmbed fetch helper.
 *
 * `durationSeconds` is intentionally absent: the YouTube oEmbed endpoint
 * does not return duration. Callers that need duration must use the YouTube
 * Data API (`videos.list?part=contentDetails`), which requires an API key.
 */
export interface VideoMetadata {
  /** 11-character YouTube video id. */
  videoId: string
  /** Canonical watch URL: `https://www.youtube.com/watch?v=<videoId>`. */
  url: string
  /** Video title from oEmbed response. */
  title: string
  /** Channel/author name from oEmbed response. */
  authorName?: string
  /**
   * Best-available thumbnail URL from oEmbed.
   *
   * oEmbed returns `thumbnail_url` which is typically the `hqdefault` image;
   * we pass it through as-is rather than rebuilding the URL, so the actual
   * resolution may differ from `buildThumbnailUrl`.
   */
  thumbnailUrl: string
  /**
   * Video duration in seconds.
   *
   * Not populated by `fetchVideoOEmbed` because oEmbed does not return
   * duration. May be populated by callers that separately query the
   * Data API.
   */
  durationSeconds?: number
}

/**
 * A minimal lesson draft produced by playlist import.
 *
 * Fields are named to match the camelCase shape expected by
 * `createLessonSchema` in `lib/validation/lesson.ts`. Callers must supply
 * `slug` and `isPreview` before persisting; those fields are not derivable
 * from the YouTube API response.
 */
export interface LessonDraft {
  /** 11-character YouTube video id. */
  youtubeVideoId: string
  /** Canonical watch URL. */
  youtubeUrl: string
  /** Video title from the playlist snippet. */
  title: string
  /** Video description from the playlist snippet (may be empty). */
  description?: string
  /** Best available thumbnail URL from the playlist snippet. */
  thumbnailUrl: string
  /**
   * Zero-based position in the playlist. Sequential from 0 in the order
   * the YouTube API returns items (which is the playlist display order).
   */
  sortOrder: number
  /**
   * Duration in seconds parsed from ISO-8601 contentDetails.
   *
   * Present only when the optional `videos.list` enrichment call succeeds.
   * When the enrichment call fails the field is omitted rather than failing
   * the whole import.
   */
  durationSeconds?: number
}
