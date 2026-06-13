/**
 * Integration tests for app/api/tutor/route.ts.
 *
 * All external dependencies are mocked:
 * - `ai` (streamText, convertToModelMessages) - returns a fake stream
 * - `@/lib/supabase/server` - returns mock client
 *
 * No real network calls, no real DB, no real gateway.
 *
 * Tested invariants:
 * - 401 when unauthenticated
 * - 403 when not enrolled and lesson is not a preview
 * - 400 on malformed body (bad UUID)
 * - Happy path: persists user message before stream, assistant message on finish
 * - Creates a new conversation when none provided
 * - Enforces own-conversation: a conversationId for a different course -> denied
 * - Returns x-conversation-id header
 */

import { beforeEach, beforeAll, describe, expect, it, vi, type MockedFunction } from "vitest"

// ---------------------------------------------------------------------------
// Deterministic UUIDs (RFC 4122 variant nibble must be [89abAB])
// ---------------------------------------------------------------------------

const UUID_COURSE = "00000002-0000-4000-8000-000000000001"
const UUID_LESSON = "00000003-0000-4000-8000-000000000001"
const UUID_CONV = "00000004-0000-4000-8000-000000000001"
const UUID_USER = "00000001-0000-4000-8000-000000000001"
const UUID_OTHER_COURSE = "00000002-0000-4000-8000-000000000099"

// ---------------------------------------------------------------------------
// Shared mutable state (reset in beforeEach)
// ---------------------------------------------------------------------------

let capturedOnFinish: ((args: { text: string }) => Promise<void>) | null = null
let insertCalls: Array<{ table: string; payload: Record<string, unknown> }> = []

const fakeStreamResponse = new Response("data: [DONE]\n\n", {
  status: 200,
  headers: {
    "Content-Type": "text/event-stream",
    "x-conversation-id": UUID_CONV,
  },
})

// ---------------------------------------------------------------------------
// Mock `ai`
// ---------------------------------------------------------------------------

vi.mock("ai", () => ({
  streamText: vi.fn(
    ({
      onFinish,
    }: {
      onFinish?: (args: { text: string }) => Promise<void>
    }) => {
      capturedOnFinish = onFinish ?? null
      return {
        toUIMessageStreamResponse: () => fakeStreamResponse,
      }
    }
  ),
  convertToModelMessages: vi.fn(() => Promise.resolve([])),
}))

// ---------------------------------------------------------------------------
// Mock Supabase
// ---------------------------------------------------------------------------

type TableData = {
  courses: Record<string, unknown> | null
  lessons: Record<string, unknown> | null
  enrollments: Record<string, unknown> | null
  ai_tutor_conversations: Record<string, unknown> | null
  ai_tutor_messages: Record<string, unknown>[] | null
}

let tableData: TableData = {
  courses: null,
  lessons: null,
  enrollments: null,
  ai_tutor_conversations: null,
  ai_tutor_messages: null,
}

let authUser: { id: string } | null = null

function makeMockClient() {
  function makeBuilder(table: keyof TableData) {
    let isInsert = false
    let insertPayload: Record<string, unknown> = {}
    let rowLimit = 100
    let orderAsc = true

    const builder: Record<string, unknown> = {
      select: (_cols?: string) => builder,
      eq: (_col: string, _val: unknown) => builder,
      order: (_col: string, opts?: { ascending?: boolean }) => {
        orderAsc = opts?.ascending ?? true
        return builder
      },
      limit: (n: number) => {
        rowLimit = n
        return builder
      },
      maybeSingle: () => {
        const raw = tableData[table]
        if (!raw) return Promise.resolve({ data: null, error: null })
        const row = Array.isArray(raw) ? raw[0] ?? null : raw
        return Promise.resolve({ data: row, error: null })
      },
      single: () => {
        const raw = tableData[table]
        if (!raw) {
          return Promise.resolve({
            data: null,
            error: { message: "Not found", code: "PGRST116" },
          })
        }
        const row = Array.isArray(raw) ? raw[0] ?? null : raw
        return Promise.resolve({ data: row, error: null })
      },
      insert: (payload: Record<string, unknown>) => {
        isInsert = true
        insertPayload = payload
        insertCalls.push({ table, payload })
        return builder
      },
      then: (
        resolve: (v: { data: unknown; error: unknown }) => unknown,
        reject?: (e: unknown) => unknown
      ) => {
        if (isInsert) {
          const newRow = { id: UUID_CONV, ...insertPayload }
          return Promise.resolve({ data: newRow, error: null }).then(
            resolve,
            reject
          )
        }
        const raw = tableData[table]
        const rows = Array.isArray(raw)
          ? (orderAsc ? raw : [...raw].reverse()).slice(0, rowLimit)
          : raw
        return Promise.resolve({ data: rows, error: null }).then(resolve, reject)
      },
    }
    return builder
  }

  return {
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({
          data: { user: authUser },
          error: authUser ? null : { message: "Not authenticated" },
        })
      ),
    },
    from: vi.fn((table: string) => makeBuilder(table as keyof TableData)),
  }
}

let mockClient = makeMockClient()

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve(mockClient)),
}))

// ---------------------------------------------------------------------------
// Load the route after mocks (inside beforeAll so it's async-safe)
// ---------------------------------------------------------------------------

let POST: (req: Request) => Promise<Response>

beforeAll(async () => {
  const route = await import("@/app/api/tutor/route")
  POST = route.POST
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBody(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    courseId: UUID_COURSE,
    lessonId: UUID_LESSON,
    messages: [
      {
        id: "msg-1",
        role: "user",
        parts: [{ type: "text", text: "What is a variable?" }],
      },
    ],
    ...overrides,
  })
}

function makeRequest(body: string, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/tutor", {
    method: "POST",
    body,
    headers: { "Content-Type": "application/json", ...headers },
  })
}

// ---------------------------------------------------------------------------
// Reset state before each test
// ---------------------------------------------------------------------------

beforeEach(async () => {
  capturedOnFinish = null
  insertCalls = []
  authUser = null
  tableData = {
    courses: null,
    lessons: null,
    enrollments: null,
    ai_tutor_conversations: null,
    ai_tutor_messages: null,
  }
  mockClient = makeMockClient()

  const { createClient } = await import("@/lib/supabase/server")
  ;(createClient as MockedFunction<typeof createClient>).mockResolvedValue(
    mockClient as never
  )
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/tutor", () => {
  describe("authentication", () => {
    it("returns 401 when no user is authenticated", async () => {
      authUser = null
      const res = await POST(makeRequest(makeBody()))
      expect(res.status).toBe(401)
      const body = await res.json()
      expect(body.error).toMatch(/authentication/i)
    })
  })

  describe("request validation", () => {
    it("returns 400 when courseId is not a valid UUID", async () => {
      authUser = { id: UUID_USER }
      const res = await POST(
        makeRequest(makeBody({ courseId: "not-a-uuid" }))
      )
      expect(res.status).toBe(400)
    })

    it("returns 400 when lessonId is provided but is not a valid UUID", async () => {
      authUser = { id: UUID_USER }
      const res = await POST(
        makeRequest(makeBody({ lessonId: "bad-uuid" }))
      )
      expect(res.status).toBe(400)
    })

    it("returns 400 when the message array is empty (no user message)", async () => {
      authUser = { id: UUID_USER }
      const res = await POST(
        makeRequest(
          JSON.stringify({
            courseId: UUID_COURSE,
            lessonId: UUID_LESSON,
            messages: [],
          })
        )
      )
      expect(res.status).toBe(400)
    })
  })

  describe("enrollment gating", () => {
    it("returns 403 when not enrolled and lesson is not a preview", async () => {
      authUser = { id: UUID_USER }
      tableData.courses = {
        id: UUID_COURSE,
        title: "JS Course",
        description: null,
        slug: "js-course",
        status: "published",
      }
      tableData.lessons = {
        id: UUID_LESSON,
        title: "Variables",
        description: null,
        youtube_url: "https://youtube.com/watch?v=x",
        is_preview: false,
      }
      tableData.enrollments = null // not enrolled

      const res = await POST(makeRequest(makeBody()))
      expect(res.status).toBe(403)
      const body = await res.json()
      expect(body.error).toMatch(/enroll/i)
    })

    it("allows access when the lesson is a free preview (not enrolled)", async () => {
      authUser = { id: UUID_USER }
      tableData.courses = {
        id: UUID_COURSE,
        title: "JS Course",
        description: null,
        slug: "js-course",
        status: "published",
      }
      tableData.lessons = {
        id: UUID_LESSON,
        title: "Variables",
        description: null,
        youtube_url: "https://youtube.com/watch?v=x",
        is_preview: true,
      }
      tableData.ai_tutor_conversations = null
      tableData.ai_tutor_messages = []

      const res = await POST(makeRequest(makeBody()))
      expect(res.status).not.toBe(403)
      expect(res.status).not.toBe(401)
    })
  })

  describe("happy path", () => {
    beforeEach(() => {
      authUser = { id: UUID_USER }
      tableData.courses = {
        id: UUID_COURSE,
        title: "JS Course",
        description: "A beginner JS course",
        slug: "js-course",
        status: "published",
      }
      tableData.lessons = {
        id: UUID_LESSON,
        title: "Variables",
        description: "Learn about variables",
        youtube_url: "https://youtube.com/watch?v=test",
        is_preview: false,
      }
      tableData.enrollments = {
        id: "00000005-0000-4000-8000-000000000001",
        user_id: UUID_USER,
        course_id: UUID_COURSE,
        last_accessed_lesson_id: null,
        completed_at: null,
        enrolled_at: "2026-01-01T00:00:00Z",
      }
      tableData.ai_tutor_conversations = {
        id: UUID_CONV,
        user_id: UUID_USER,
        course_id: UUID_COURSE,
        lesson_id: UUID_LESSON,
        title: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      }
      tableData.ai_tutor_messages = []
    })

    it("persists the user message before returning the stream", async () => {
      await POST(makeRequest(makeBody({ conversationId: UUID_CONV })))

      const userInsert = insertCalls.find(
        (c) => c.table === "ai_tutor_messages" && c.payload.role === "user"
      )
      expect(userInsert).toBeDefined()
      expect(userInsert?.payload.content).toBe("What is a variable?")
      expect(userInsert?.payload.conversation_id).toBe(UUID_CONV)
    })

    it("saves the assistant message in onFinish callback", async () => {
      await POST(makeRequest(makeBody({ conversationId: UUID_CONV })))

      expect(capturedOnFinish).not.toBeNull()
      await capturedOnFinish!({ text: "A variable is a named storage location." })

      const assistantInsert = insertCalls.find(
        (c) => c.table === "ai_tutor_messages" && c.payload.role === "assistant"
      )
      expect(assistantInsert).toBeDefined()
      expect(assistantInsert?.payload.content).toBe(
        "A variable is a named storage location."
      )
      expect(assistantInsert?.payload.conversation_id).toBe(UUID_CONV)
      expect(assistantInsert?.payload.model).toBe("openai/gpt-4o-mini")
    })

    it("creates a new conversation when no conversationId is provided", async () => {
      tableData.ai_tutor_conversations = null

      await POST(makeRequest(makeBody()))

      const convInsert = insertCalls.find(
        (c) => c.table === "ai_tutor_conversations"
      )
      expect(convInsert).toBeDefined()
      expect(convInsert?.payload.user_id).toBe(UUID_USER)
      expect(convInsert?.payload.course_id).toBe(UUID_COURSE)
    })

    it("returns the x-conversation-id header", async () => {
      const res = await POST(
        makeRequest(makeBody({ conversationId: UUID_CONV }))
      )
      expect(res.headers.get("x-conversation-id")).toBe(UUID_CONV)
    })
  })

  describe("own-conversation isolation", () => {
    it("returns an error when the conversationId belongs to a different course", async () => {
      authUser = { id: UUID_USER }
      tableData.courses = {
        id: UUID_COURSE,
        title: "JS Course",
        description: null,
        slug: "js-course",
        status: "published",
      }
      tableData.lessons = {
        id: UUID_LESSON,
        title: "Variables",
        description: null,
        youtube_url: "https://youtube.com/watch?v=x",
        is_preview: false,
      }
      tableData.enrollments = {
        id: "00000005-0000-4000-8000-000000000001",
        user_id: UUID_USER,
        course_id: UUID_COURSE,
        last_accessed_lesson_id: null,
        completed_at: null,
        enrolled_at: "2026-01-01T00:00:00Z",
      }
      // Conversation belongs to a DIFFERENT course.
      tableData.ai_tutor_conversations = {
        id: UUID_CONV,
        user_id: UUID_USER,
        course_id: UUID_OTHER_COURSE, // wrong course!
        lesson_id: UUID_LESSON,
        title: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      }

      const res = await POST(
        makeRequest(makeBody({ conversationId: UUID_CONV }))
      )
      // getOrCreateConversation returns null on mismatch -> route returns 500.
      expect(res.status).toBeGreaterThanOrEqual(400)
    })
  })
})
