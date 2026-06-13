/**
 * POST /api/tutor
 *
 * Dedicated AI tutor endpoint. Separate from /api/chat because this route:
 * - Requires authentication (401 if unauthenticated)
 * - Enforces enrollment or preview gating (403 if denied)
 * - Injects course+lesson context into the system prompt
 * - Persists messages to Supabase (ai_tutor_messages) with RLS isolation
 * - Manages conversation identity (create or resume)
 * - Scopes history to the conversation's own messages
 *
 * /api/chat remains an unauthenticated demo route (tech-debt, not fixed here).
 *
 * The model string "openai/gpt-4o-mini" is routed through Vercel AI Gateway
 * automatically when AI_GATEWAY_API_KEY is set. No explicit gateway client or
 * provider package is imported - the bare string is the convention established
 * in batch 00.
 *
 * AI_GATEWAY_API_KEY is server-only and must NEVER appear in client code or
 * NEXT_PUBLIC_ env vars.
 */

import { convertToModelMessages, streamText, type UIMessage } from "ai"

import { createClient } from "@/lib/supabase/server"
import { getEnrollment } from "@/lib/progress/queries"
import { tutorMessageSchema } from "@/lib/validation/tutor"
import { buildTutorSystemPrompt, capHistory } from "@/lib/tutor/prompt"
import {
  getOrCreateConversation,
  getConversationMessages,
} from "@/lib/tutor/queries"
import { saveUserMessage, saveAssistantMessage } from "@/lib/tutor/persistence"

export const maxDuration = 30

const TUTOR_MODEL = "openai/gpt-4o-mini"

/** Returns a safe JSON error response with no stack traces or secrets. */
function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message }, { status })
}

export async function POST(req: Request): Promise<Response> {
  // ------------------------------------------------------------------
  // 1. Parse and validate the request body.
  // ------------------------------------------------------------------
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return errorResponse("Invalid JSON body", 400)
  }

  // The useChat client sends { messages: UIMessage[], ...extras }.
  // Extract the control fields and validate them; messages are handled separately.
  const bodyRecord = body as Record<string, unknown>
  const controlFields = {
    courseId: bodyRecord.courseId,
    lessonId: bodyRecord.lessonId,
    conversationId: bodyRecord.conversationId,
    // content is extracted from the last user message below
    content: "",
  }

  const messages = (bodyRecord.messages ?? []) as UIMessage[]

  // Extract the latest user message text for persistence.
  const lastUserMessage = [...messages]
    .reverse()
    .find((m) => m.role === "user")

  const latestUserText = lastUserMessage
    ? lastUserMessage.parts
        .map((p) => (p.type === "text" ? p.text : ""))
        .join("")
        .trim()
    : ""

  // Validate control fields + extracted content together.
  const parsed = tutorMessageSchema.safeParse({
    ...controlFields,
    content: latestUserText,
  })

  if (!parsed.success) {
    return errorResponse("Invalid request: " + parsed.error.message, 400)
  }

  const { courseId, lessonId, conversationId } = parsed.data
  const userContent = parsed.data.content

  // ------------------------------------------------------------------
  // 2. Authentication check.
  // ------------------------------------------------------------------
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return errorResponse("Authentication required", 401)
  }

  const userId = user.id

  // ------------------------------------------------------------------
  // 3. Load course + optional lesson.
  // ------------------------------------------------------------------
  // We need the course detail to get lesson data (is_preview, description).
  // We look up by ID via getCourseDetailBySlug only works by slug,
  // so we do a direct query by ID here.
  const { data: courseRow } = await supabase
    .from("courses")
    .select("id, title, description, slug, status")
    .eq("id", courseId)
    .eq("status", "published")
    .single()

  if (!courseRow) {
    return errorResponse("Course not found", 404)
  }

  // Load the lesson if lessonId was provided.
  let lessonRow:
    | {
        id: string
        title: string
        description: string | null
        youtube_url: string
        is_preview: boolean
      }
    | null = null

  if (lessonId) {
    const { data } = await supabase
      .from("lessons")
      .select("id, title, description, youtube_url, is_preview")
      .eq("id", lessonId)
      .eq("course_id", courseId)
      .single()

    lessonRow = data ?? null
  }

  // ------------------------------------------------------------------
  // 4. Enrollment / preview gate.
  // ------------------------------------------------------------------
  const isPreview = lessonRow?.is_preview ?? false
  let isEnrolled = false

  if (!isPreview) {
    const enrollment = await getEnrollment(userId, courseId)
    isEnrolled = enrollment !== null

    if (!isEnrolled) {
      return errorResponse(
        "Enroll in this course to use the AI tutor",
        403
      )
    }
  }

  // ------------------------------------------------------------------
  // 5. Get or create conversation.
  // ------------------------------------------------------------------
  const conversation = await getOrCreateConversation({
    userId,
    courseId,
    lessonId,
    conversationId,
  })

  if (!conversation) {
    return errorResponse("Could not load or create conversation", 500)
  }

  // ------------------------------------------------------------------
  // 6. Load recent message history.
  // ------------------------------------------------------------------
  const history = await getConversationMessages(conversation.id, 20)

  // ------------------------------------------------------------------
  // 7. Persist user message BEFORE streaming.
  // ------------------------------------------------------------------
  await saveUserMessage(conversation.id, userContent)

  // ------------------------------------------------------------------
  // 8. Build system prompt.
  // ------------------------------------------------------------------
  // Detect locale from Accept-Language header as a lightweight signal;
  // the client can also embed locale in the request body for accuracy.
  const acceptLanguage = req.headers.get("accept-language") ?? ""
  const locale =
    (bodyRecord.locale as string | undefined) ??
    (acceptLanguage.startsWith("he") ? "he" : "en")

  const systemPrompt = buildTutorSystemPrompt({
    courseName: courseRow.title,
    courseDescription: courseRow.description ?? null,
    lessonTitle: lessonRow?.title ?? null,
    lessonDescription: lessonRow?.description ?? null,
    youtubeUrl: lessonRow?.youtube_url ?? null,
    locale,
  })

  // ------------------------------------------------------------------
  // 9. Assemble model messages from persisted history + the new user turn.
  // ------------------------------------------------------------------
  // We use the persisted history (TutorMessageDTO) rather than the raw
  // UIMessage history from the client to keep the model's view of the
  // conversation consistent with what is in the DB.
  const historyUIMessages: UIMessage[] = history.map((msg, idx) => ({
    id: msg.id ?? String(idx),
    role: msg.role as "user" | "assistant",
    parts: [{ type: "text" as const, text: msg.content }],
  }))

  // Cap history and convert to model messages format.
  const cappedHistory = capHistory(historyUIMessages, 18) // leave room for new user turn
  const newUserUIMessage: UIMessage = {
    id: `user-${Date.now()}`,
    role: "user",
    parts: [{ type: "text", text: userContent }],
  }

  const modelMessages = await convertToModelMessages([
    ...cappedHistory,
    newUserUIMessage,
  ])

  // ------------------------------------------------------------------
  // 10. Stream the response.
  // ------------------------------------------------------------------
  const convId = conversation.id

  const result = streamText({
    model: TUTOR_MODEL,
    system: systemPrompt,
    messages: modelMessages,
    onFinish: async ({ text }) => {
      // Save the assistant's full response after the stream completes.
      await saveAssistantMessage(convId, text, TUTOR_MODEL)
    },
  })

  // Include the conversation ID in the response so the client can persist it
  // for subsequent requests (conversation resume).
  const streamResponse = result.toUIMessageStreamResponse()
  const headers = new Headers(streamResponse.headers)
  headers.set("x-conversation-id", convId)

  return new Response(streamResponse.body, {
    status: streamResponse.status,
    headers,
  })
}
