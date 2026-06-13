/**
 * Unit tests for lib/youtube/parser.ts.
 *
 * All tests are pure - no network calls, no environment access.
 * The parser module must remain side-effect-free so these tests run without
 * any mocking infrastructure.
 */

import { describe, expect, it } from "vitest"

import {
  buildThumbnailUrl,
  buildWatchUrl,
  extractPlaylistId,
  extractVideoId,
  isYouTubeUrl,
  parseYouTubeUrl,
} from "@/lib/youtube/parser"
import { iso8601DurationToSeconds } from "@/lib/youtube/metadata"

// ---------------------------------------------------------------------------
// extractVideoId - valid URLs
// ---------------------------------------------------------------------------

describe("extractVideoId - standard watch URLs", () => {
  it("parses https://www.youtube.com/watch?v=dQw4w9WgXcY", () => {
    expect(extractVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcY")).toBe(
      "dQw4w9WgXcY"
    )
  })

  it("parses http:// variant", () => {
    expect(extractVideoId("http://www.youtube.com/watch?v=dQw4w9WgXcY")).toBe(
      "dQw4w9WgXcY"
    )
  })

  it("parses youtube.com without www", () => {
    expect(extractVideoId("https://youtube.com/watch?v=dQw4w9WgXcY")).toBe(
      "dQw4w9WgXcY"
    )
  })

  it("parses m.youtube.com (mobile)", () => {
    expect(extractVideoId("https://m.youtube.com/watch?v=dQw4w9WgXcY")).toBe(
      "dQw4w9WgXcY"
    )
  })

  it("parses music.youtube.com", () => {
    expect(extractVideoId("https://music.youtube.com/watch?v=dQw4w9WgXcY")).toBe(
      "dQw4w9WgXcY"
    )
  })

  it("ignores extra query params", () => {
    expect(
      extractVideoId(
        "https://www.youtube.com/watch?v=dQw4w9WgXcY&t=30&feature=share"
      )
    ).toBe("dQw4w9WgXcY")
  })

  it("ignores list param (still extracts video id)", () => {
    expect(
      extractVideoId(
        "https://www.youtube.com/watch?v=dQw4w9WgXcY&list=PLrAXtmErZgOeiKm4sgNOk"
      )
    ).toBe("dQw4w9WgXcY")
  })
})

describe("extractVideoId - youtu.be short links", () => {
  it("parses https://youtu.be/dQw4w9WgXcY", () => {
    expect(extractVideoId("https://youtu.be/dQw4w9WgXcY")).toBe("dQw4w9WgXcY")
  })

  it("parses youtu.be with trailing query params", () => {
    expect(extractVideoId("https://youtu.be/dQw4w9WgXcY?t=42")).toBe(
      "dQw4w9WgXcY"
    )
  })

  it("parses http://youtu.be/", () => {
    expect(extractVideoId("http://youtu.be/dQw4w9WgXcY")).toBe("dQw4w9WgXcY")
  })
})

describe("extractVideoId - embed URLs", () => {
  it("parses /embed/ID", () => {
    expect(
      extractVideoId("https://www.youtube.com/embed/dQw4w9WgXcY")
    ).toBe("dQw4w9WgXcY")
  })

  it("parses /embed/ID with query params", () => {
    expect(
      extractVideoId(
        "https://www.youtube.com/embed/dQw4w9WgXcY?autoplay=1"
      )
    ).toBe("dQw4w9WgXcY")
  })
})

describe("extractVideoId - shorts URLs", () => {
  it("parses /shorts/ID", () => {
    expect(
      extractVideoId("https://www.youtube.com/shorts/dQw4w9WgXcY")
    ).toBe("dQw4w9WgXcY")
  })

  it("parses /shorts/ID with trailing slash", () => {
    expect(
      extractVideoId("https://www.youtube.com/shorts/dQw4w9WgXcY/")
    ).toBe("dQw4w9WgXcY")
  })
})

describe("extractVideoId - legacy /v/ URLs", () => {
  it("parses /v/ID", () => {
    expect(
      extractVideoId("https://www.youtube.com/v/dQw4w9WgXcY")
    ).toBe("dQw4w9WgXcY")
  })
})

// ---------------------------------------------------------------------------
// extractVideoId - rejections
// ---------------------------------------------------------------------------

describe("extractVideoId - rejections", () => {
  it("returns null for a Vimeo URL", () => {
    expect(extractVideoId("https://vimeo.com/123456789")).toBeNull()
  })

  it("returns null for a non-URL string", () => {
    expect(extractVideoId("not-a-url")).toBeNull()
  })

  it("returns null for an empty string", () => {
    expect(extractVideoId("")).toBeNull()
  })

  it("returns null for a bare video id (no URL scheme)", () => {
    expect(extractVideoId("dQw4w9WgXcY")).toBeNull()
  })

  it("returns null for a protocol-relative URL", () => {
    expect(extractVideoId("//www.youtube.com/watch?v=dQw4w9WgXcY")).toBeNull()
  })

  it("returns null for a javascript: scheme", () => {
    expect(
      extractVideoId("javascript:alert('xss')")
    ).toBeNull()
  })

  it("returns null when v= param has wrong length (10 chars)", () => {
    expect(
      extractVideoId("https://www.youtube.com/watch?v=dQw4w9WgXc")
    ).toBeNull()
  })

  it("returns null when v= param has wrong length (12 chars)", () => {
    expect(
      extractVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcYZ")
    ).toBeNull()
  })

  it("returns null when v= param contains invalid character", () => {
    expect(
      extractVideoId("https://www.youtube.com/watch?v=dQw4w9Wg!cY")
    ).toBeNull()
  })

  it("returns null for youtube.com root with no path", () => {
    expect(extractVideoId("https://www.youtube.com/")).toBeNull()
  })

  it("returns null for youtube.com channel page", () => {
    expect(
      extractVideoId("https://www.youtube.com/@SomeChannel")
    ).toBeNull()
  })

  it("returns null for youtu.be with no path segment", () => {
    expect(extractVideoId("https://youtu.be/")).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// extractPlaylistId - valid URLs
// ---------------------------------------------------------------------------

describe("extractPlaylistId - playlist page URLs", () => {
  it("parses /playlist?list=PLrAXtmErZgOeiKm4sgNOknc9TTnpFbUAJ", () => {
    expect(
      extractPlaylistId(
        "https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknc9TTnpFbUAJ"
      )
    ).toBe("PLrAXtmErZgOeiKm4sgNOknc9TTnpFbUAJ")
  })

  it("parses m.youtube.com playlist", () => {
    expect(
      extractPlaylistId(
        "https://m.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknc9TTnpFbUAJ"
      )
    ).toBe("PLrAXtmErZgOeiKm4sgNOknc9TTnpFbUAJ")
  })
})

describe("extractPlaylistId - watch URLs with list param", () => {
  it("parses watch?v=ID&list=PLID", () => {
    expect(
      extractPlaylistId(
        "https://www.youtube.com/watch?v=dQw4w9WgXcY&list=PLrAXtmErZgOeiKm4sgNOknc9TTnpFbUAJ"
      )
    ).toBe("PLrAXtmErZgOeiKm4sgNOknc9TTnpFbUAJ")
  })

  it("parses UU (uploads) playlist id", () => {
    expect(
      extractPlaylistId(
        "https://www.youtube.com/playlist?list=UUsomechannelid1234567"
      )
    ).toBe("UUsomechannelid1234567")
  })

  it("parses RD (radio/mix) playlist id", () => {
    expect(
      extractPlaylistId(
        "https://www.youtube.com/watch?v=dQw4w9WgXcY&list=RDdQw4w9WgXcY1234567"
      )
    ).toBe("RDdQw4w9WgXcY1234567")
  })
})

describe("extractPlaylistId - rejections", () => {
  it("returns null for Vimeo URL", () => {
    expect(
      extractPlaylistId("https://vimeo.com/channels/staffpicks")
    ).toBeNull()
  })

  it("returns null for youtube URL with no list param", () => {
    expect(
      extractPlaylistId("https://www.youtube.com/watch?v=dQw4w9WgXcY")
    ).toBeNull()
  })

  it("returns null for empty string", () => {
    expect(extractPlaylistId("")).toBeNull()
  })

  it("returns null when list param is too short (< 13 chars)", () => {
    // 12-char list id should be rejected by the playlist id regex.
    expect(
      extractPlaylistId("https://www.youtube.com/playlist?list=PLshort12345")
    ).toBeNull()
  })

  it("returns null for non-URL garbage", () => {
    expect(extractPlaylistId("PLrAXtmErZgOeiKm4sgNOknc9TTnpFbUAJ")).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// parseYouTubeUrl - kind and id precedence
// ---------------------------------------------------------------------------

describe("parseYouTubeUrl - kind discrimination", () => {
  it("returns kind=video for a watch URL with video id only", () => {
    const result = parseYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcY")
    expect(result.kind).toBe("video")
    expect(result.videoId).toBe("dQw4w9WgXcY")
    expect(result.playlistId).toBeUndefined()
  })

  it("returns kind=video and populates both ids for watch?v=ID&list=PL", () => {
    const result = parseYouTubeUrl(
      "https://www.youtube.com/watch?v=dQw4w9WgXcY&list=PLrAXtmErZgOeiKm4sgNOknc9TTnpFbUAJ"
    )
    expect(result.kind).toBe("video")
    expect(result.videoId).toBe("dQw4w9WgXcY")
    expect(result.playlistId).toBe("PLrAXtmErZgOeiKm4sgNOknc9TTnpFbUAJ")
  })

  it("returns kind=playlist for /playlist?list=ID", () => {
    const result = parseYouTubeUrl(
      "https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknc9TTnpFbUAJ"
    )
    expect(result.kind).toBe("playlist")
    expect(result.playlistId).toBe("PLrAXtmErZgOeiKm4sgNOknc9TTnpFbUAJ")
    expect(result.videoId).toBeUndefined()
  })

  it("returns kind=unknown for a Vimeo URL", () => {
    const result = parseYouTubeUrl("https://vimeo.com/123456789")
    expect(result.kind).toBe("unknown")
    expect(result.videoId).toBeUndefined()
    expect(result.playlistId).toBeUndefined()
  })

  it("returns kind=unknown for non-URL garbage", () => {
    const result = parseYouTubeUrl("not-a-url")
    expect(result.kind).toBe("unknown")
  })

  it("returns kind=video for a youtu.be short link", () => {
    const result = parseYouTubeUrl("https://youtu.be/dQw4w9WgXcY")
    expect(result.kind).toBe("video")
    expect(result.videoId).toBe("dQw4w9WgXcY")
  })

  it("returns kind=video for /shorts/ URL", () => {
    const result = parseYouTubeUrl(
      "https://www.youtube.com/shorts/dQw4w9WgXcY"
    )
    expect(result.kind).toBe("video")
    expect(result.videoId).toBe("dQw4w9WgXcY")
  })
})

// ---------------------------------------------------------------------------
// isYouTubeUrl
// ---------------------------------------------------------------------------

describe("isYouTubeUrl", () => {
  it("returns true for www.youtube.com", () => {
    expect(isYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcY")).toBe(
      true
    )
  })

  it("returns true for youtu.be", () => {
    expect(isYouTubeUrl("https://youtu.be/dQw4w9WgXcY")).toBe(true)
  })

  it("returns true for m.youtube.com", () => {
    expect(isYouTubeUrl("https://m.youtube.com/")).toBe(true)
  })

  it("returns true for music.youtube.com", () => {
    expect(isYouTubeUrl("https://music.youtube.com/")).toBe(true)
  })

  it("returns false for vimeo.com", () => {
    expect(isYouTubeUrl("https://vimeo.com/123456789")).toBe(false)
  })

  it("returns false for non-URL garbage", () => {
    expect(isYouTubeUrl("not-a-url")).toBe(false)
  })

  it("returns false for empty string", () => {
    expect(isYouTubeUrl("")).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// buildWatchUrl
// ---------------------------------------------------------------------------

describe("buildWatchUrl", () => {
  it("builds the canonical watch URL", () => {
    expect(buildWatchUrl("dQw4w9WgXcY")).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcY"
    )
  })
})

// ---------------------------------------------------------------------------
// buildThumbnailUrl
// ---------------------------------------------------------------------------

describe("buildThumbnailUrl", () => {
  it("builds the hqdefault thumbnail URL", () => {
    expect(buildThumbnailUrl("dQw4w9WgXcY")).toBe(
      "https://i.ytimg.com/vi/dQw4w9WgXcY/hqdefault.jpg"
    )
  })
})

// ---------------------------------------------------------------------------
// iso8601DurationToSeconds (pure helper from metadata.ts)
// ---------------------------------------------------------------------------

describe("iso8601DurationToSeconds", () => {
  it("parses PT1H2M3S -> 3723", () => {
    expect(iso8601DurationToSeconds("PT1H2M3S")).toBe(3723)
  })

  it("parses PT45S -> 45", () => {
    expect(iso8601DurationToSeconds("PT45S")).toBe(45)
  })

  it("parses PT10M -> 600", () => {
    expect(iso8601DurationToSeconds("PT10M")).toBe(600)
  })

  it("parses PT1H -> 3600", () => {
    expect(iso8601DurationToSeconds("PT1H")).toBe(3600)
  })

  it("parses P0D (zero-duration) -> 0", () => {
    expect(iso8601DurationToSeconds("P0D")).toBe(0)
  })

  it("parses PT0S -> 0", () => {
    expect(iso8601DurationToSeconds("PT0S")).toBe(0)
  })

  it("parses PT1H30M -> 5400", () => {
    expect(iso8601DurationToSeconds("PT1H30M")).toBe(5400)
  })

  it("returns 0 for an empty string", () => {
    expect(iso8601DurationToSeconds("")).toBe(0)
  })

  it("returns 0 for a garbage string", () => {
    expect(iso8601DurationToSeconds("not-a-duration")).toBe(0)
  })

  it("returns 0 for bare PT with no components", () => {
    expect(iso8601DurationToSeconds("PT")).toBe(0)
  })
})
