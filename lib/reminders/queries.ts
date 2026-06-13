"use server"

import { createClient } from "@/lib/supabase/server"
import { toReminderEventDTO } from "@/lib/reminders/types"
import type { ReminderEventDTO } from "@/lib/reminders/types"

/**
 * Identifies inactive students using the `admin_stuck_students` view.
 *
 * The view returns students enrolled in a course who have been inactive
 * (no lesson watched) for more than 7 days. It is security_invoker so
 * RLS applies; only instructors (is_admin) can read these rows.
 *
 * Admin-only: the caller MUST have already called requireAdmin().
 *
 * @returns Array of stuck-student view rows.
 */
export async function identifyInactiveStudents(): Promise<
  {
    userId: string
    courseId: string
    daysInactive: number
    lastWatchedAt: string | null
    enrolledAt: string | null
    inactiveFor: string | null
  }[]
> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("admin_stuck_students")
    .select(
      "user_id, course_id, days_inactive, last_watched_at, enrolled_at, inactive_for"
    )
    .order("days_inactive", { ascending: false })
    .limit(100)

  if (error) {
    console.error("[reminders/queries] identifyInactiveStudents:", error)
    return []
  }

  return (data ?? []).map((row) => ({
    userId: row.user_id ?? "",
    courseId: row.course_id ?? "",
    daysInactive: row.days_inactive ?? 0,
    lastWatchedAt: row.last_watched_at,
    enrolledAt: row.enrolled_at,
    inactiveFor: row.inactive_for,
  }))
}

/**
 * Returns all reminder events ordered by created_at descending.
 *
 * Admin-only: the caller MUST have already called requireAdmin().
 *
 * @param limit - Maximum rows to return (default 50).
 * @returns Array of {@link ReminderEventDTO}.
 */
export async function listReminderEvents(
  limit = 50
): Promise<ReminderEventDTO[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("reminder_events")
    .select(
      "id, user_id, course_id, reason, status, sent_at, created_at, updated_at, metadata"
    )
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("[reminders/queries] listReminderEvents:", error)
    return []
  }

  return (data ?? []).map(toReminderEventDTO)
}
