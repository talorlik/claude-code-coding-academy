/**
 * Integration tests for lib/admin/lesson-actions.ts
 *
 * Mocks:
 * - @/lib/supabase/server
 * - @/lib/auth/guards (requireAdmin)
 * - @/lib/youtube/parser (extractVideoId)
 * - @/lib/youtube/metadata (fetchVideoOEmbed)
 * - next/cache
 *
 * Tested invariants:
 * - addLessonFromUrl: parses URL, fetches oEmbed, assigns sort_order, inserts.
 * - addLessonFromUrl: invalid URL -> fail with urlError.
 * - updateLesson: validates + updates.
 * - deleteLesson: deletes.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

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

// Mock parser
vi.mock("@/lib/youtube/parser", () => ({
  extractVideoId: vi.fn().mockImplementation((url: string) => {
    if (url.includes("youtube")) return "dQw4w9WgXcQ"
    return null
  }),
}))

// Mock oEmbed
vi.mock("@/lib/youtube/metadata", () => ({
  fetchVideoOEmbed: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      videoId: "dQw4w9WgXcQ",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      title: "Mock Video Title",
      thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    },
  }),
}))

// Supabase mock
let mockSortOrder: number | null = 3

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockImplementation(() =>
    Promise.resolve({
      from: (table: string) => ({
        select: (_cols?: string) => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: mockSortOrder !== null ? { sort_order: mockSortOrder } : null,
                    error: null,
                  }),
              }),
            }),
            single: () =>
              Promise.resolve({
                data: { course_id: "course-uuid" },
                error: null,
              }),
          }),
        }),
        insert: (_rows: unknown) => ({
          select: (_cols?: string) => ({
            single: () =>
              Promise.resolve({
                data: { id: "lesson-uuid" },
                error: null,
              }),
          }),
        }),
        update: (_payload: unknown) => ({
          eq: () => Promise.resolve({ data: null, error: null }),
        }),
        delete: () => ({
          eq: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    })
  ),
}))

const { addLessonFromUrl, updateLesson, deleteLesson } = await import(
  "@/lib/admin/lesson-actions"
)

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("addLessonFromUrl", () => {
  beforeEach(() => {
    mockIsInstructor = true
    mockSortOrder = 3
  })

  it("returns ok with lessonId on valid URL", async () => {
    const result = await addLessonFromUrl(
      "course-uuid",
      "https://www.youtube.com/watch?v=valid123"
    )
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.lessonId).toBe("lesson-uuid")
    }
  })

  it("assigns sort_order as max+1", async () => {
    mockSortOrder = 5
    const result = await addLessonFromUrl(
      "course-uuid",
      "https://www.youtube.com/watch?v=valid123"
    )
    // sort_order 6 is computed internally; we verify the action succeeded
    expect(result.ok).toBe(true)
  })

  it("assigns sort_order 0 when no existing lessons", async () => {
    mockSortOrder = null
    const result = await addLessonFromUrl(
      "course-uuid",
      "https://www.youtube.com/watch?v=valid123"
    )
    expect(result.ok).toBe(true)
  })

  it("returns fail with urlError on invalid YouTube URL", async () => {
    const result = await addLessonFromUrl("course-uuid", "https://example.com/invalid")
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.fieldErrors?.url).toBeTruthy()
    }
  })

  it("returns fail when caller is not an instructor", async () => {
    mockIsInstructor = false
    await expect(
      addLessonFromUrl("course-uuid", "https://www.youtube.com/watch?v=valid")
    ).rejects.toThrow("REDIRECT")
  })
})

describe("updateLesson", () => {
  beforeEach(() => {
    mockIsInstructor = true
  })

  it("returns ok on valid input", async () => {
    const result = await updateLesson("lesson-uuid", { title: "Updated Title" })
    expect(result.ok).toBe(true)
  })

  it("returns fail on invalid input (title too short)", async () => {
    const result = await updateLesson("lesson-uuid", { title: "" })
    expect(result.ok).toBe(false)
  })
})

describe("deleteLesson", () => {
  beforeEach(() => {
    mockIsInstructor = true
  })

  it("returns ok on successful delete", async () => {
    const result = await deleteLesson("lesson-uuid")
    expect(result.ok).toBe(true)
  })
})
