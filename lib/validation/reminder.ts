import { z } from "zod"

/** Valid reminder delivery statuses. */
const reminderStatusSchema = z.enum(["queued", "sent", "failed", "skipped"])

/**
 * Schema for queuing or updating a reminder action.
 *
 * `courseId` is optional because some reminders are not course-specific
 * (e.g. general re-engagement nudges for inactive users).
 */
export const reminderActionSchema = z.object({
  // `.guid()` not `.string().uuid()`: Zod 4's `.uuid()` enforces RFC 9562
  // version/variant nibbles and rejects the repeated-character placeholder course
  // IDs the seed data uses. Postgres stores those as valid `uuid`, so the column
  // type is the contract. `.guid()` accepts any 8-4-4-4-12 hex string. `userId` is
  // a real RFC UUID from Supabase auth; kept on `.guid()` for consistency.
  userId: z.guid("User ID must be a valid UUID"),
  courseId: z.guid("Course ID must be a valid UUID").optional(),
  reason: z.string().min(1, "Reason is required"),
  status: reminderStatusSchema,
})

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

/** Input type inferred from {@link reminderActionSchema}. */
export type ReminderActionInput = z.infer<typeof reminderActionSchema>
