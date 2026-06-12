import { convertToModelMessages, streamText, type UIMessage } from "ai"

// Allow streaming responses up to 30 seconds.
export const maxDuration = 30

/**
 * Chat endpoint. The model is given as a bare `provider/model` string, which
 * the AI SDK routes through Vercel AI Gateway automatically when
 * `AI_GATEWAY_API_KEY` is set - no provider package or explicit gateway client
 * needed. Swap the string to change models (e.g. "openai/gpt-4o",
 * "google/gemini-2.5-pro") without touching anything else.
 */
export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()

  const result = streamText({
    model: "openai/gpt-4o-mini",
    system: "You are a helpful assistant.",
    messages: await convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse()
}
