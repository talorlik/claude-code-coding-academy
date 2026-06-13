import type { Database } from "@/lib/supabase/database.types"

type ReminderEventRow = Database["public"]["Tables"]["reminder_events"]["Row"]

/**
 * Delivery status of a reminder event.
 * Mirrors the `reminder_status` Postgres enum.
 */
export type ReminderStatus = Database["public"]["Enums"]["reminder_status"]

/**
 * DTO for a reminder event. Maps from the `reminder_events` table row.
 *
 * Reminders are queued by the system and dispatched by a background worker.
 * The `status` tracks the delivery lifecycle.
 */
export interface ReminderEventDTO {
  /** UUID primary key. */
  id: string
  /** User the reminder targets. */
  userId: string
  /**
   * Course the reminder is about, or null when the reminder is not
   * course-specific (e.g. a general re-engagement nudge).
   */
  courseId: string | null
  /** Human-readable reason for the reminder (e.g. "no activity in 7 days"). */
  reason: string
  /** Current delivery status. */
  status: ReminderStatus
  /** ISO timestamp when the reminder was sent, or null when pending. */
  sentAt: string | null
  /** ISO timestamp of row creation. */
  createdAt: string
  /** ISO timestamp of last status update. */
  updatedAt: string
}

/**
 * Maps a raw `reminder_events` row to a {@link ReminderEventDTO}.
 * The unstructured `metadata` JSON blob is omitted from the DTO.
 */
export function toReminderEventDTO(row: ReminderEventRow): ReminderEventDTO {
  return {
    id: row.id,
    userId: row.user_id,
    courseId: row.course_id,
    reason: row.reason,
    status: row.status,
    sentAt: row.sent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
