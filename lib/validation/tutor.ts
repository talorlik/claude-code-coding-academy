import { z } from "zod"

/**
 * Schema for sending a message to the AI tutor.
 *
 * `courseId` is required so the tutor can scope context to the right course.
 * `lessonId` and `conversationId` are optional - omitting `conversationId`
 * signals that a new conversation should be created.
 *
 * IDs are validated with `z.guid()` rather than `z.string().uuid()`. Zod 4's
 * `.uuid()` enforces the RFC 9562 version/variant nibbles, which rejects the
 * repeated-character placeholder IDs the seed data uses (e.g.
 * `11111111-1111-1111-1111-111111111111`). Postgres stores those as valid
 * `uuid` values, so the column type - not RFC strictness - is the real
 * contract. `.guid()` accepts any 8-4-4-4-12 hex string, matching what the DB
 * actually persists and unblocking the tutor for seeded courses.
 */
export const tutorMessageSchema = z.object({
  courseId: z.guid("Course ID must be a valid UUID"),
  lessonId: z.guid("Lesson ID must be a valid UUID").optional(),
  conversationId: z.guid("Conversation ID must be a valid UUID").optional(),
  /**
   * The message text from the user.
   * Trimmed before validation. Max 4000 chars to prevent runaway payloads.
   */
  content: z
    .string()
    .min(1, "Message content is required")
    .max(4000, "Message content must be 4000 characters or fewer")
    .transform((v) => v.trim())
    .refine((v) => v.length > 0, "Message content cannot be blank"),
})

/**
 * Schema for creating a new tutor conversation without an initial message.
 * Used by UIs that create conversations eagerly before the first message.
 */
export const createConversationSchema = z.object({
  courseId: z.guid("Course ID must be a valid UUID"),
  lessonId: z.guid("Lesson ID must be a valid UUID").optional(),
  title: z.string().max(255, "Title must be 255 characters or fewer").optional(),
})

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

/** Input type inferred from {@link tutorMessageSchema}. */
export type TutorMessageInput = z.infer<typeof tutorMessageSchema>

/** Input type inferred from {@link createConversationSchema}. */
export type CreateConversationInput = z.infer<typeof createConversationSchema>
