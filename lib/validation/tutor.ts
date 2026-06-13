import { z } from "zod"

/**
 * Schema for sending a message to the AI tutor.
 *
 * `courseId` is required so the tutor can scope context to the right course.
 * `lessonId` and `conversationId` are optional - omitting `conversationId`
 * signals that a new conversation should be created.
 */
export const tutorMessageSchema = z.object({
  courseId: z.string().uuid("Course ID must be a valid UUID"),
  lessonId: z.string().uuid("Lesson ID must be a valid UUID").optional(),
  conversationId: z
    .string()
    .uuid("Conversation ID must be a valid UUID")
    .optional(),
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
  courseId: z.string().uuid("Course ID must be a valid UUID"),
  lessonId: z.string().uuid("Lesson ID must be a valid UUID").optional(),
  title: z.string().max(255, "Title must be 255 characters or fewer").optional(),
})

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

/** Input type inferred from {@link tutorMessageSchema}. */
export type TutorMessageInput = z.infer<typeof tutorMessageSchema>

/** Input type inferred from {@link createConversationSchema}. */
export type CreateConversationInput = z.infer<typeof createConversationSchema>
