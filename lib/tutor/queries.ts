import "server-only"
/**
 * Server-only tutor data query helpers.
 *
 * All functions use the request-scoped Supabase client so RLS applies and
 * every read/write is scoped to the authenticated user. The DB enforces
 * ownership: a student can only read/write their own conversations and
 * messages (via the owning conversation).
 *
 * NEVER call these functions with a service-role client - that would bypass
 * the RLS isolation that keeps conversations private.
 *
 * @module lib/tutor/queries
 */

import { createClient } from "@/lib/supabase/server"
import {
  toTutorConversationDTO,
  toTutorMessageDTO,
  type TutorConversationDTO,
  type TutorMessageDTO,
} from "@/lib/tutor/types"

// ---------------------------------------------------------------------------
// Conversation helpers
// ---------------------------------------------------------------------------

/**
 * Parameters for {@link getOrCreateConversation}.
 */
export interface GetOrCreateConversationParams {
  /** Authenticated user's id (from auth.uid()). */
  userId: string
  /** UUID of the course this conversation is anchored to. */
  courseId: string
  /** UUID of the current lesson, or undefined for course-level scope. */
  lessonId?: string
  /**
   * UUID of an existing conversation to resume.
   * When provided, the conversation is loaded and its course ownership is
   * verified (in addition to RLS enforcement).
   * When omitted, a new conversation is created.
   */
  conversationId?: string
}

/**
 * Returns an existing conversation or creates a new one.
 *
 * When `conversationId` is provided: loads the conversation (RLS ensures it
 * belongs to the authenticated user) and verifies it belongs to `courseId`
 * to prevent cross-course context leakage. Returns null if the conversation
 * is not found or does not match the course.
 *
 * When `conversationId` is omitted: inserts a new conversation row scoped to
 * the user, course, and optional lesson. Returns the new conversation DTO.
 *
 * @returns The conversation DTO, or null on a DB error or ownership mismatch.
 */
export async function getOrCreateConversation(
  params: GetOrCreateConversationParams
): Promise<TutorConversationDTO | null> {
  const { userId, courseId, lessonId, conversationId } = params
  const supabase = await createClient()

  if (conversationId) {
    // Resume existing conversation. RLS already enforces user ownership;
    // we additionally verify the course matches to prevent leakage.
    const { data, error } = await supabase
      .from("ai_tutor_conversations")
      .select("*")
      .eq("id", conversationId)
      .maybeSingle()

    if (error) {
      console.error("[tutor/queries] getOrCreateConversation load:", error)
      return null
    }
    if (!data) return null
    // Double-check course ownership (belt + suspenders on top of RLS).
    if (data.course_id !== courseId) {
      console.error(
        "[tutor/queries] getOrCreateConversation course mismatch",
        conversationId
      )
      return null
    }

    return toTutorConversationDTO(data)
  }

  // Create a new conversation.
  const { data, error } = await supabase
    .from("ai_tutor_conversations")
    .insert({
      user_id: userId,
      course_id: courseId,
      lesson_id: lessonId ?? null,
      title: null,
    })
    .select("*")
    .single()

  if (error || !data) {
    console.error("[tutor/queries] getOrCreateConversation insert:", error)
    return null
  }

  return toTutorConversationDTO(data)
}

// ---------------------------------------------------------------------------
// Message helpers
// ---------------------------------------------------------------------------

/**
 * Returns the most recent messages for a conversation, mapped to DTOs.
 *
 * RLS restricts reads to messages whose owning conversation belongs to the
 * authenticated user (enforced via the conversation join or policy).
 *
 * @param conversationId - UUID of the conversation.
 * @param cap - Maximum number of messages to return (default: 20).
 * @returns Ordered array of {@link TutorMessageDTO} (oldest first), or empty
 *   array on error.
 */
export async function getConversationMessages(
  conversationId: string,
  cap: number = 20
): Promise<TutorMessageDTO[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("ai_tutor_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(cap)

  if (error) {
    console.error("[tutor/queries] getConversationMessages:", error)
    return []
  }

  // Reverse so the returned array is oldest-first (chronological order).
  return (data ?? []).map(toTutorMessageDTO).reverse()
}

/**
 * Returns a list of conversations for a user+course pair, ordered newest first.
 *
 * Useful for letting the student resume a previous conversation. RLS scopes
 * results to the authenticated user automatically.
 *
 * @param userId - Authenticated user's id.
 * @param courseId - UUID of the course.
 * @returns Array of {@link TutorConversationDTO} (newest first), or empty array
 *   on error.
 */
export async function listConversationsForCourse(
  userId: string,
  courseId: string
): Promise<TutorConversationDTO[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("ai_tutor_conversations")
    .select("*")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .order("updated_at", { ascending: false })
    .limit(10)

  if (error) {
    console.error("[tutor/queries] listConversationsForCourse:", error)
    return []
  }

  return (data ?? []).map((row) => toTutorConversationDTO(row))
}
