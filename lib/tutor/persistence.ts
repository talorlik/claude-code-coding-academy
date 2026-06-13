import "server-only"
/**
 * Server-only tutor message persistence helpers.
 *
 * Separate from queries.ts to distinguish reads from writes. All functions
 * use the request-scoped client so RLS applies. Insert operations only write
 * to conversations that belong to the authenticated user (enforced by the DB).
 *
 * @module lib/tutor/persistence
 */

import { createClient } from "@/lib/supabase/server"

// ---------------------------------------------------------------------------
// Message writers
// ---------------------------------------------------------------------------

/**
 * Inserts a user message row into `ai_tutor_messages`.
 *
 * Call this BEFORE starting the stream so the user's message is persisted
 * even if the stream fails mid-way.
 *
 * @param conversationId - UUID of the owning conversation.
 * @param content - The user's message text (already validated and trimmed).
 * @returns True on success, false on DB error.
 */
export async function saveUserMessage(
  conversationId: string,
  content: string
): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase.from("ai_tutor_messages").insert({
    conversation_id: conversationId,
    role: "user",
    content,
    model: null,
    metadata: null,
  })

  if (error) {
    console.error("[tutor/persistence] saveUserMessage:", error)
    return false
  }

  return true
}

/**
 * Inserts an assistant message row into `ai_tutor_messages`.
 *
 * Call this in the `onFinish` callback of `streamText` so it runs after the
 * full response has been generated. Only the final text is saved - no partial
 * streaming state enters the DB.
 *
 * Metadata stored: minimal safe fields only. No secrets, no raw request data,
 * no user PII beyond what is already in the conversation row.
 *
 * @param conversationId - UUID of the owning conversation.
 * @param content - The complete assistant response text.
 * @param model - Model identifier string (e.g. "openai/gpt-4o-mini").
 * @returns True on success, false on DB error.
 */
export async function saveAssistantMessage(
  conversationId: string,
  content: string,
  model: string
): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase.from("ai_tutor_messages").insert({
    conversation_id: conversationId,
    role: "assistant",
    content,
    model,
    metadata: null,
  })

  if (error) {
    console.error("[tutor/persistence] saveAssistantMessage:", error)
    return false
  }

  return true
}
