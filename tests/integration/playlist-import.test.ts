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
 * - Invalid URL: fail with urlError.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"
import type { LessonDraft } from "@/lib/youtube/types"

// The canonical missing-key message. Duplicated here because the mock module
// factory is hoisted above all imports; we cannot reference the imported
// constant inside the factory.
const MISSING_API_KEY_MESSAGE =
  "Playlist import requires a server-side YOUTUBE_API_KEY. " +
  "Add the key to your .env.local file and restart the server."

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

// Metadata mock - vi.fn() with no factory.
vi.mock("@/lib/youtube/metadata", () => ({
  fetchPlaylistItems: vi.fn(),
  MISSING_API_KEY_MESSAGE:
    "Playlist import requires a server-side YOUTUBE_API_KEY. " +
    "Add the key to your .env.local file and restart the server.",
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

  it("returns fail on invalid playlist URL", async () => {
    vi.mocked(extractPlaylistId).mockReturnValue(null)
    const result = await importPlaylist(
      "course-uuid",
      "https://example.com/not-a-playlist"
    )
    expect(result.ok).toBe(false)
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
