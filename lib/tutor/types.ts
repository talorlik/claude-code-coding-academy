import type { Database } from "@/lib/supabase/database.types"

// ---------------------------------------------------------------------------
// Enum aliases
// ---------------------------------------------------------------------------

/**
 * Role for a message in an AI tutor conversation.
 * Mirrors the `tutor_message_role` Postgres enum.
 */
export type TutorRole = Database["public"]["Enums"]["tutor_message_role"]

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

/**
 * DTO for a single message in an AI tutor conversation.
 * Maps from the `ai_tutor_messages` table row.
 */
export interface TutorMessageDTO {
  /** UUID primary key. */
  id: string
  /** Conversation this message belongs to. */
  conversationId: string
  /** Who authored the message. */
  role: TutorRole
  /** Text content of the message. */
  content: string
  /**
   * Model identifier used to generate this response (e.g. "claude-3-5-sonnet").
   * Null for user messages and legacy rows.
   */
  model: string | null
  /** ISO timestamp of creation. */
  createdAt: string
}

/**
 * DTO for an AI tutor conversation. May optionally include the hydrated
 * message list when the caller fetches both in one query.
 */
export interface TutorConversationDTO {
  /** UUID primary key. */
  id: string
  /** Course this conversation is anchored to. */
  courseId: string
  /**
   * Lesson the conversation started in, or null when the conversation is
   * scoped to the whole course.
   */
  lessonId: string | null
  /**
   * Auto-generated or user-supplied conversation title.
   * Null until the backend assigns one.
   */
  title: string | null
  /**
   * Hydrated message list. Present when the query joins messages;
   * omitted when only conversation metadata is fetched.
   */
  messages?: TutorMessageDTO[]
  /** ISO timestamp of creation. */
  createdAt: string
  /** ISO timestamp of last update (e.g. last message sent). */
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

type MessageRow = Database["public"]["Tables"]["ai_tutor_messages"]["Row"]
type ConversationRow =
  Database["public"]["Tables"]["ai_tutor_conversations"]["Row"]

/**
 * Maps a raw `ai_tutor_messages` row to a {@link TutorMessageDTO}.
 */
export function toTutorMessageDTO(row: MessageRow): TutorMessageDTO {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    model: row.model,
    createdAt: row.created_at,
  }
}

/**
 * Maps a raw `ai_tutor_conversations` row to a {@link TutorConversationDTO}.
 * Pass hydrated `messages` when they are fetched in the same query.
 */
export function toTutorConversationDTO(
  row: ConversationRow,
  messages?: TutorMessageDTO[]
): TutorConversationDTO {
  return {
    id: row.id,
    courseId: row.course_id,
    lessonId: row.lesson_id,
    title: row.title,
    messages,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
