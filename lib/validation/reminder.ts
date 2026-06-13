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
  userId: z.string().uuid("User ID must be a valid UUID"),
  courseId: z.string().uuid("Course ID must be a valid UUID").optional(),
  reason: z.string().min(1, "Reason is required"),
  status: reminderStatusSchema,
})

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

/** Input type inferred from {@link reminderActionSchema}. */
export type ReminderActionInput = z.infer<typeof reminderActionSchema>
