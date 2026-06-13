"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth/guards"
import { fail, ok } from "@/lib/types/action-result"
import type { ActionResult } from "@/lib/types/action-result"
import { toReminderEventDTO } from "@/lib/reminders/types"
import type { ReminderEventDTO } from "@/lib/reminders/types"

// Idempotency window in hours: do not create a duplicate queued reminder
// for the same user+course+reason within this window.
const DEDUP_WINDOW_HOURS = 24

/**
 * Queues a reminder for a student.
 *
 * Guards: requireAdmin() - instructor role required.
 *
 * Delivery: EMAIL_PROVIDER_API_KEY is NOT configured in this project.
 * Reminders are queued with status='queued' and displayed in the admin UI.
 * If a provider WERE configured, this action would set status='sent' after
 * successful dispatch. Documenting this queue-visible behavior so future
 * developers know where to add the provider call.
 *
 * Idempotency: before inserting, this checks for an existing 'queued'
 * reminder for the same userId+courseId+reason created within the last
 * DEDUP_WINDOW_HOURS hours. If found, returns the existing row to avoid
 * duplicate queue entries.
 *
 * @param userId   - UUID of the student to remind.
 * @param courseId - UUID of the course (optional for general nudges).
 * @param reason   - Human-readable reason string.
 * @returns `ok(ReminderEventDTO)` on success or `fail(message)` on error.
 */
export async function queueReminder(
  userId: string,
  courseId: string | null,
  reason: string
): Promise<ActionResult<ReminderEventDTO>> {
  await requireAdmin()
  const supabase = await createClient()

  if (!userId || !reason) {
    return fail<ReminderEventDTO>("userId and reason are required.")
  }

  // Idempotency check: look for a recent queued reminder for this
  // user+course+reason combination within the dedup window.
  const windowStart = new Date(
    Date.now() - DEDUP_WINDOW_HOURS * 60 * 60 * 1000
  ).toISOString()

  let dedupQuery = supabase
    .from("reminder_events")
    .select("id, user_id, course_id, reason, status, sent_at, created_at, updated_at, metadata")
    .eq("user_id", userId)
    .eq("reason", reason)
    .eq("status", "queued")
    .gte("created_at", windowStart)

  if (courseId) {
    dedupQuery = dedupQuery.eq("course_id", courseId)
  } else {
    dedupQuery = dedupQuery.is("course_id", null)
  }

  const { data: existing } = await dedupQuery.maybeSingle()

  if (existing) {
    // Return existing queued reminder rather than creating a duplicate.
    return ok<ReminderEventDTO>(toReminderEventDTO(existing))
  }

  // Insert a new queued reminder.
  const insertData: {
    user_id: string
    course_id?: string | null
    reason: string
    status: "queued"
    metadata: Record<string, string>
  } = {
    user_id: userId,
    reason,
    status: "queued",
    // Metadata note: when a provider is configured, add provider-specific
    // fields here (e.g. email_template_id, sender_id). Keep it safe - no
    // API keys or secrets in the metadata column.
    metadata: {
      provider: "none",
      note: "No EMAIL_PROVIDER_API_KEY configured. Queued for visibility.",
    },
  }

  if (courseId) {
    insertData.course_id = courseId
  }

  const { data, error } = await supabase
    .from("reminder_events")
    .insert(insertData)
    .select(
      "id, user_id, course_id, reason, status, sent_at, created_at, updated_at, metadata"
    )
    .single()

  if (error) {
    console.error("[reminders/actions] queueReminder:", error)
    return fail<ReminderEventDTO>("Failed to queue reminder. Please try again.")
  }

  revalidatePath("/", "layout")

  return ok<ReminderEventDTO>(toReminderEventDTO(data))
}

/**
 * Updates the status of an existing reminder event.
 *
 * Guards: requireAdmin() - instructor role required.
 *
 * @param id     - UUID of the reminder_events row.
 * @param status - New status value.
 * @returns `ok(ReminderEventDTO)` on success or `fail(message)` on error.
 */
export async function markReminderStatus(
  id: string,
  status: import("@/lib/reminders/types").ReminderStatus
): Promise<ActionResult<ReminderEventDTO>> {
  await requireAdmin()
  const supabase = await createClient()

  const updateData: { status: typeof status; sent_at?: string } = { status }
  if (status === "sent") {
    updateData.sent_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from("reminder_events")
    .update(updateData)
    .eq("id", id)
    .select(
      "id, user_id, course_id, reason, status, sent_at, created_at, updated_at, metadata"
    )
    .single()

  if (error) {
    console.error("[reminders/actions] markReminderStatus:", error)
    return fail<ReminderEventDTO>(
      "Failed to update reminder status. Please try again."
    )
  }

  revalidatePath("/", "layout")

  return ok<ReminderEventDTO>(toReminderEventDTO(data))
}
