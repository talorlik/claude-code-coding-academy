/**
 * Unit tests for lib/youtube/metadata.ts.
 *
 * All network calls are mocked via vi.stubGlobal / vi.spyOn. No real HTTP
 * requests are made. The YOUTUBE_API_KEY env var is stubbed per-test where
 * needed and restored in afterEach.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  MISSING_API_KEY_MESSAGE,
  fetchPlaylistItems,
  fetchVideoOEmbed,
} from "@/lib/youtube/metadata"

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Minimal valid oEmbed JSON response body. */
const OEMBED_FIXTURE = {
  title: "Rick Astley - Never Gonna Give You Up",
  author_name: "RickAstleyVEVO",
  thumbnail_url: "https://i.ytimg.com/vi/dQw4w9WgXcY/hqdefault.jpg",
  thumbnail_width: 480,
  thumbnail_height: 360,
  type: "video",
  version: "1.0",
}

/** Minimal valid playlistItems response. */
const PLAYLIST_ITEMS_FIXTURE = {
  nextPageToken: undefined,
  items: [
    {
      snippet: {
        title: "Lesson 1: Introduction",
        description: "First lesson description",
        thumbnails: { high: { url: "https://i.ytimg.com/vi/abc12345678/hqdefault.jpg" } },
        resourceId: { videoId: "abc12345678" },
        position: 0,
      },
    },
    {
      snippet: {
        title: "Lesson 2: Advanced",
        description: "Second lesson description",
        thumbnails: { high: { url: "https://i.ytimg.com/vi/xyz12345678/hqdefault.jpg" } },
        resourceId: { videoId: "xyz12345678" },
        position: 1,
      },
    },
  ],
}

/** Minimal valid videos.list response for duration enrichment. */
const VIDEOS_CONTENT_DETAILS_FIXTURE = {
  items: [
    { id: "abc12345678", contentDetails: { duration: "PT10M30S" } },
    { id: "xyz12345678", contentDetails: { duration: "PT5M" } },
  ],
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a mocked Response-like object that fetch will return.
 */
function mockResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response
}

// ---------------------------------------------------------------------------
// fetchVideoOEmbed tests
// ---------------------------------------------------------------------------

describe("fetchVideoOEmbed", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch")
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns ok(VideoMetadata) on a successful oEmbed response", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      mockResponse(OEMBED_FIXTURE)
    )

    const result = await fetchVideoOEmbed(
      "https://www.youtube.com/watch?v=dQw4w9WgXcY"
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.data.videoId).toBe("dQw4w9WgXcY")
    expect(result.data.title).toBe(OEMBED_FIXTURE.title)
    expect(result.data.authorName).toBe(OEMBED_FIXTURE.author_name)
    expect(result.data.thumbnailUrl).toBe(OEMBED_FIXTURE.thumbnail_url)
    expect(result.data.url).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcY")
    // oEmbed does NOT return duration.
    expect(result.data.durationSeconds).toBeUndefined()
  })

  it("accepts a bare 11-char video id as input", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      mockResponse(OEMBED_FIXTURE)
    )

    const result = await fetchVideoOEmbed("dQw4w9WgXcY")

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.videoId).toBe("dQw4w9WgXcY")
  })

  it("returns fail when oEmbed responds with 404", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      mockResponse(null, 404)
    )

    const result = await fetchVideoOEmbed(
      "https://www.youtube.com/watch?v=dQw4w9WgXcY"
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.message).toMatch(/unavailable/i)
  })

  it("returns fail when oEmbed responds with 401", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      mockResponse(null, 401)
    )

    const result = await fetchVideoOEmbed(
      "https://www.youtube.com/watch?v=dQw4w9WgXcY"
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.message).toMatch(/unavailable/i)
  })

  it("returns fail when oEmbed responds with unexpected status", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      mockResponse(null, 500)
    )

    const result = await fetchVideoOEmbed(
      "https://www.youtube.com/watch?v=dQw4w9WgXcY"
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.message).toMatch(/500/)
  })

  it("returns fail on network error", async () => {
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error("Network down"))

    const result = await fetchVideoOEmbed(
      "https://www.youtube.com/watch?v=dQw4w9WgXcY"
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.message).toMatch(/network error/i)
  })

  it("returns fail on fetch timeout (AbortError)", async () => {
    const abortErr = new DOMException("The operation was aborted", "AbortError")
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(abortErr)

    const result = await fetchVideoOEmbed(
      "https://www.youtube.com/watch?v=dQw4w9WgXcY"
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.message).toMatch(/timed out/i)
  })

  it("returns fail when the URL is not a valid YouTube URL", async () => {
    const result = await fetchVideoOEmbed("https://vimeo.com/12345678")

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.message).toMatch(/invalid youtube url/i)
  })

  it("returns fail when JSON parse fails", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.reject(new SyntaxError("bad JSON")),
    } as unknown as Response)

    const result = await fetchVideoOEmbed(
      "https://www.youtube.com/watch?v=dQw4w9WgXcY"
    )

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.message).toMatch(/json/i)
  })
})

// ---------------------------------------------------------------------------
// fetchPlaylistItems tests
// ---------------------------------------------------------------------------

describe("fetchPlaylistItems - missing API key", () => {
  beforeEach(() => {
    vi.stubEnv("YOUTUBE_API_KEY", "")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("returns fail with the canonical missing-key message when key is empty", async () => {
    const result = await fetchPlaylistItems("PLrAXtmErZgOeiKm4sgNOknc9TTnpFbUAJ")

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.message).toBe(MISSING_API_KEY_MESSAGE)
  })
})

describe("fetchPlaylistItems - with stubbed API key", () => {
  beforeEach(() => {
    vi.stubEnv("YOUTUBE_API_KEY", "test-api-key")
    vi.spyOn(globalThis, "fetch")
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  it("returns ok(LessonDraft[]) with correct shape and sequential sortOrder", async () => {
    // First call: playlistItems.list
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce(mockResponse(PLAYLIST_ITEMS_FIXTURE))
      // Second call: videos.list (duration enrichment)
      .mockResolvedValueOnce(mockResponse(VIDEOS_CONTENT_DETAILS_FIXTURE))

    const result = await fetchPlaylistItems("PLrAXtmErZgOeiKm4sgNOknc9TTnpFbUAJ")

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const drafts = result.data
    expect(drafts).toHaveLength(2)

    // sortOrder must be sequential from 0.
    expect(drafts[0].sortOrder).toBe(0)
    expect(drafts[1].sortOrder).toBe(1)

    // Video IDs and URLs must be set.
    expect(drafts[0].youtubeVideoId).toBe("abc12345678")
    expect(drafts[0].youtubeUrl).toBe(
      "https://www.youtube.com/watch?v=abc12345678"
    )
    expect(drafts[1].youtubeVideoId).toBe("xyz12345678")

    // Titles from snippet.
    expect(drafts[0].title).toBe("Lesson 1: Introduction")
    expect(drafts[1].title).toBe("Lesson 2: Advanced")

    // Thumbnails from snippet high quality.
    expect(drafts[0].thumbnailUrl).toBe(
      "https://i.ytimg.com/vi/abc12345678/hqdefault.jpg"
    )

    // Duration from enrichment call.
    expect(drafts[0].durationSeconds).toBe(630) // PT10M30S
    expect(drafts[1].durationSeconds).toBe(300) // PT5M
  })

  it("returns drafts without duration when videos.list fails", async () => {
    // playlistItems succeeds, videos.list fails with 403.
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce(mockResponse(PLAYLIST_ITEMS_FIXTURE))
      .mockResolvedValueOnce(mockResponse(null, 403))

    const result = await fetchPlaylistItems("PLrAXtmErZgOeiKm4sgNOknc9TTnpFbUAJ")

    expect(result.ok).toBe(true)
    if (!result.ok) return

    const drafts = result.data
    expect(drafts).toHaveLength(2)
    // Duration enrichment degraded gracefully.
    expect(drafts[0].durationSeconds).toBeUndefined()
    expect(drafts[1].durationSeconds).toBeUndefined()
  })

  it("returns fail on 403 from playlistItems API", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(mockResponse(null, 403))

    const result = await fetchPlaylistItems("PLrAXtmErZgOeiKm4sgNOknc9TTnpFbUAJ")

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.message).toMatch(/403/i)
  })

  it("returns fail on 404 from playlistItems API", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(mockResponse(null, 404))

    const result = await fetchPlaylistItems("PLrAXtmErZgOeiKm4sgNOknc9TTnpFbUAJ")

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.message).toMatch(/not found/i)
  })

  it("returns fail on network error from playlistItems API", async () => {
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error("Network down"))

    const result = await fetchPlaylistItems("PLrAXtmErZgOeiKm4sgNOknc9TTnpFbUAJ")

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.message).toMatch(/network error/i)
  })

  it("returns ok([]) when playlist has no items", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce(
      mockResponse({ items: [] })
    )

    const result = await fetchPlaylistItems("PLrAXtmErZgOeiKm4sgNOknc9TTnpFbUAJ")

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data).toHaveLength(0)
  })
})

describe("fetchPlaylistItems - YOUTUBE_API_KEY is undefined (not set)", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("returns fail with the canonical missing-key message when key is not set", async () => {
    // Ensure the env var is absent (not just empty).
    vi.stubEnv("YOUTUBE_API_KEY", "")

    const result = await fetchPlaylistItems("PLrAXtmErZgOeiKm4sgNOknc9TTnpFbUAJ")

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.message).toBe(MISSING_API_KEY_MESSAGE)
  })
})
