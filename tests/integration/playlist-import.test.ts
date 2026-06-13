/**
 * Integration tests for lib/youtube/playlist.ts (importPlaylist, previewPlaylist)
 *
 * Mocks:
 * - @/lib/youtube/metadata (fetchPlaylistItems)
 * - @/lib/youtube/parser (extractPlaylistId)
 * - @/lib/auth/guards (requireAdmin)
 * - @/lib/supabase/server
 * - next/cache
 *
 * Tested invariants:
 * - Missing key: fetchPlaylistItems returns fail(MISSING_API_KEY_MESSAGE)
 *   and importPlaylist propagates it.
 * - With key + mocked items: imports N lessons with sequential sort_order.
 * - Invalid URL: fail propagated with INVALID_PLAYLIST_URL_MESSAGE.
 * - 403 response: fail propagated with QUOTA_EXCEEDED_MESSAGE.
 * - 404 response: fail propagated with PLAYLIST_NOT_FOUND_MESSAGE.
 * - Empty playlist: ok({imported: 0}) returned without touching Supabase.
 * - Admin guard: non-instructor triggers throw.
 * - Pagination: sort_order is sequential regardless of how many items.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"
import type { LessonDraft } from "@/lib/youtube/types"

// Canonical sentinel strings duplicated here because vi.mock factories are
// hoisted above imports and cannot reference module-level constants.
const MISSING_API_KEY_MESSAGE =
  "Playlist import requires a server-side YOUTUBE_API_KEY. " +
  "Add the key to your .env.local file and restart the server."

const QUOTA_EXCEEDED_MESSAGE =
  "YouTube API returned 403: quota exceeded or invalid API key."

const PLAYLIST_NOT_FOUND_MESSAGE =
  "Playlist not found: it may be private or the ID is incorrect."

const INVALID_PLAYLIST_URL_MESSAGE =
  "Invalid playlist URL. Please enter a valid YouTube playlist URL containing a 'list=' parameter."

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

let mockIsInstructor = true

vi.mock("@/lib/auth/guards", () => ({
  requireAdmin: vi.fn().mockImplementation(() => {
    if (!mockIsInstructor) throw new Error("REDIRECT")
    return Promise.resolve("instructor-uuid")
  }),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

// Parser mock - vi.fn() with no factory so we can control it via vi.mocked.
vi.mock("@/lib/youtube/parser", () => ({
  extractPlaylistId: vi.fn(),
}))

// Metadata mock - vi.fn() with no factory. All sentinel strings must be
// inlined here because the factory is hoisted before module evaluation.
vi.mock("@/lib/youtube/metadata", () => ({
  fetchPlaylistItems: vi.fn(),
  MISSING_API_KEY_MESSAGE:
    "Playlist import requires a server-side YOUTUBE_API_KEY. " +
    "Add the key to your .env.local file and restart the server.",
  QUOTA_EXCEEDED_MESSAGE:
    "YouTube API returned 403: quota exceeded or invalid API key.",
  PLAYLIST_NOT_FOUND_MESSAGE:
    "Playlist not found: it may be private or the ID is incorrect.",
  INVALID_PLAYLIST_URL_MESSAGE:
    "Invalid playlist URL. Please enter a valid YouTube playlist URL containing a 'list=' parameter.",
}))

// Supabase mock
let mockMaxSortOrder: number | null = 2
let insertedRows: unknown[] = []

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(() =>
    Promise.resolve({
      from: (_table: string) => ({
        select: (_cols?: string) => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: mockMaxSortOrder !== null
                      ? { sort_order: mockMaxSortOrder }
                      : null,
                    error: null,
                  }),
              }),
            }),
          }),
        }),
        insert: (rows: unknown) => {
          insertedRows = Array.isArray(rows) ? rows : [rows]
          return {
            select: (_cols?: string) =>
              Promise.resolve({
                data: insertedRows.map((_, i) => ({ id: `lesson-${i}` })),
                error: null,
              }),
          }
        },
      }),
    })
  ),
}))

// Import AFTER mocks so hoisting applies.
const { importPlaylist, previewPlaylist } = await import("@/lib/youtube/playlist")
const { extractPlaylistId } = await import("@/lib/youtube/parser")
const { fetchPlaylistItems } = await import("@/lib/youtube/metadata")

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("importPlaylist", () => {
  beforeEach(() => {
    mockIsInstructor = true
    mockMaxSortOrder = 2
    insertedRows = []

    vi.mocked(extractPlaylistId).mockReturnValue("PLfakePlaylistId123")
    vi.mocked(fetchPlaylistItems).mockResolvedValue({
      ok: false,
      message: MISSING_API_KEY_MESSAGE,
    })
  })

  it("returns fail with MISSING_API_KEY_MESSAGE when key is absent", async () => {
    const result = await importPlaylist(
      "course-uuid",
      "https://www.youtube.com/playlist?list=PLfakePlaylistId123"
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toBe(MISSING_API_KEY_MESSAGE)
    }
  })

  it("imports lessons with sequential sort_order starting from max+1", async () => {
    const drafts: LessonDraft[] = [
      {
        youtubeVideoId: "vid001",
        youtubeUrl: "https://www.youtube.com/watch?v=vid001",
        title: "Lesson 1",
        thumbnailUrl: "https://img.youtube.com/vi/vid001/hqdefault.jpg",
        sortOrder: 0,
      },
      {
        youtubeVideoId: "vid002",
        youtubeUrl: "https://www.youtube.com/watch?v=vid002",
        title: "Lesson 2",
        thumbnailUrl: "https://img.youtube.com/vi/vid002/hqdefault.jpg",
        sortOrder: 1,
      },
    ]
    vi.mocked(fetchPlaylistItems).mockResolvedValue({ ok: true, data: drafts })
    mockMaxSortOrder = 2 // existing max -> new lessons start at 3

    const result = await importPlaylist(
      "course-uuid",
      "https://www.youtube.com/playlist?list=PLfake"
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.imported).toBe(2)
    }

    // Verify sort_orders: should be 3 and 4 (max+1 and max+2).
    expect((insertedRows[0] as Record<string, unknown>).sort_order).toBe(3)
    expect((insertedRows[1] as Record<string, unknown>).sort_order).toBe(4)
  })

  it("returns fail with INVALID_PLAYLIST_URL_MESSAGE on bad URL", async () => {
    vi.mocked(extractPlaylistId).mockReturnValue(null)
    const result = await importPlaylist(
      "course-uuid",
      "https://example.com/not-a-playlist"
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toBe(INVALID_PLAYLIST_URL_MESSAGE)
    }
  })

  it("propagates QUOTA_EXCEEDED_MESSAGE on 403 from YouTube", async () => {
    vi.mocked(fetchPlaylistItems).mockResolvedValue({
      ok: false,
      message: QUOTA_EXCEEDED_MESSAGE,
    })
    const result = await importPlaylist(
      "course-uuid",
      "https://www.youtube.com/playlist?list=PLfake"
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toBe(QUOTA_EXCEEDED_MESSAGE)
    }
  })

  it("propagates PLAYLIST_NOT_FOUND_MESSAGE on 404 from YouTube", async () => {
    vi.mocked(fetchPlaylistItems).mockResolvedValue({
      ok: false,
      message: PLAYLIST_NOT_FOUND_MESSAGE,
    })
    const result = await importPlaylist(
      "course-uuid",
      "https://www.youtube.com/playlist?list=PLfake"
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toBe(PLAYLIST_NOT_FOUND_MESSAGE)
    }
  })

  it("returns ok({imported: 0}) for an empty playlist without inserting rows", async () => {
    vi.mocked(fetchPlaylistItems).mockResolvedValue({ ok: true, data: [] })
    const result = await importPlaylist(
      "course-uuid",
      "https://www.youtube.com/playlist?list=PLfake"
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.imported).toBe(0)
    }
    // No rows should have been inserted.
    expect(insertedRows).toHaveLength(0)
  })

  it("assigns sort_order=0 when course has no existing lessons", async () => {
    mockMaxSortOrder = null // no existing lessons
    const drafts: LessonDraft[] = [
      {
        youtubeVideoId: "vid001",
        youtubeUrl: "https://www.youtube.com/watch?v=vid001",
        title: "First",
        thumbnailUrl: "https://img.youtube.com/vi/vid001/hqdefault.jpg",
        sortOrder: 0,
      },
    ]
    vi.mocked(fetchPlaylistItems).mockResolvedValue({ ok: true, data: drafts })

    const result = await importPlaylist(
      "course-uuid",
      "https://www.youtube.com/playlist?list=PLfake"
    )
    expect(result.ok).toBe(true)
    expect((insertedRows[0] as Record<string, unknown>).sort_order).toBe(0)
  })

  it("pagination: sequential sort_order across many items", async () => {
    // Simulate 5 items returned from paginated fetch.
    const drafts: LessonDraft[] = Array.from({ length: 5 }, (_, i) => ({
      youtubeVideoId: `vid${String(i).padStart(3, "0")}`,
      youtubeUrl: `https://www.youtube.com/watch?v=vid${String(i).padStart(3, "0")}`,
      title: `Lesson ${i + 1}`,
      thumbnailUrl: `https://img.youtube.com/vi/vid${String(i).padStart(3, "0")}/hqdefault.jpg`,
      sortOrder: i,
    }))
    vi.mocked(fetchPlaylistItems).mockResolvedValue({ ok: true, data: drafts })
    mockMaxSortOrder = 9 // existing lessons end at 9; new ones start at 10

    const result = await importPlaylist(
      "course-uuid",
      "https://www.youtube.com/playlist?list=PLfake"
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.imported).toBe(5)
    }
    // sort_orders must be 10, 11, 12, 13, 14
    const orders = (insertedRows as Array<Record<string, unknown>>).map(
      (r) => r.sort_order
    )
    expect(orders).toEqual([10, 11, 12, 13, 14])
  })

  it("throws when non-instructor calls importPlaylist (admin guard)", async () => {
    mockIsInstructor = false
    await expect(
      importPlaylist(
        "course-uuid",
        "https://www.youtube.com/playlist?list=PLfake"
      )
    ).rejects.toThrow("REDIRECT")
  })
})

describe("previewPlaylist", () => {
  beforeEach(() => {
    mockIsInstructor = true
    vi.mocked(extractPlaylistId).mockReturnValue("PLfakePlaylistId123")
    vi.mocked(fetchPlaylistItems).mockResolvedValue({
      ok: false,
      message: MISSING_API_KEY_MESSAGE,
    })
  })

  it("returns fail with MISSING_API_KEY_MESSAGE when key is absent", async () => {
    const result = await previewPlaylist(
      "https://www.youtube.com/playlist?list=PLfake"
    )
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toBe(MISSING_API_KEY_MESSAGE)
    }
  })

  it("returns drafts when API key is present", async () => {
    const drafts: LessonDraft[] = [
      {
        youtubeVideoId: "vid001",
        youtubeUrl: "https://www.youtube.com/watch?v=vid001",
        title: "Lesson 1",
        thumbnailUrl: "https://img.youtube.com/vi/vid001/hqdefault.jpg",
        sortOrder: 0,
      },
    ]
    vi.mocked(fetchPlaylistItems).mockResolvedValue({ ok: true, data: drafts })

    const result = await previewPlaylist(
      "https://www.youtube.com/playlist?list=PLfake"
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0].title).toBe("Lesson 1")
    }
  })
})
