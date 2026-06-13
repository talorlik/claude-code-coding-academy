"use server"
import "server-only"

import { revalidatePath } from "next/cache"
import { getTranslations } from "next-intl/server"

import { createClient, createAdminClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth/guards"
import { fail, ok } from "@/lib/types/action-result"
import type { ActionResult } from "@/lib/types/action-result"
import { toReminderEventDTO } from "@/lib/reminders/types"
import type { ReminderEventDTO } from "@/lib/reminders/types"
import { sendEmail } from "@/lib/email/transport"
import { getSiteUrl } from "@/lib/utils/site-url"

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

/**
 * Sends a queued reminder email to the target student and updates the
 * reminder_events row status to 'sent' or 'failed'.
 *
 * Guards: requireAdmin() - instructor role required (re-checked server-side).
 *
 * Email / locale resolution order:
 * 1. profiles.email   - stored at registration time.
 * 2. auth.users.email - canonical source via admin client when profiles.email is null.
 *
 * The student's locale from profiles.locale drives the email language.
 *
 * Idempotency: if the reminder is already 'sent', returns ok immediately
 * without re-sending.
 *
 * Security:
 * - SMTP credentials are never returned to the caller or included in error messages.
 * - The admin client is used only to read auth.users.email as a fallback.
 *
 * @param reminderId - UUID of the reminder_events row to send.
 * @returns `ok(ReminderEventDTO)` on success, `fail(safeMessage)` on error.
 */
export async function sendReminder(
  reminderId: string
): Promise<ActionResult<ReminderEventDTO>> {
  await requireAdmin()

  if (!reminderId) {
    return fail<ReminderEventDTO>("Reminder ID is required.")
  }

  const supabase = await createClient()

  // Load the reminder row (admin RLS allows instructor to read all reminder_events).
  const { data: reminder, error: reminderError } = await supabase
    .from("reminder_events")
    .select(
      "id, user_id, course_id, reason, status, sent_at, created_at, updated_at, metadata"
    )
    .eq("id", reminderId)
    .single()

  if (reminderError || !reminder) {
    console.error("[reminders/actions] sendReminder load:", reminderError)
    return fail<ReminderEventDTO>("Reminder not found.")
  }

  // Idempotency: already sent -> return ok without re-sending.
  if (reminder.status === "sent") {
    return ok<ReminderEventDTO>(toReminderEventDTO(reminder))
  }

  // Resolve the student's email and locale from profiles.
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, locale")
    .eq("user_id", reminder.user_id)
    .single()

  let toEmail = profile?.email ?? null
  const fullName = profile?.full_name ?? ""
  const locale = (profile?.locale ?? "en") as "en" | "he"

  // Fall back to auth.users email when profiles.email is null.
  if (!toEmail) {
    const adminClient = createAdminClient()
    const { data: authData } = await adminClient.auth.admin.getUserById(
      reminder.user_id
    )
    toEmail = authData?.user?.email ?? null
  }

  if (!toEmail) {
    // Status stays 'queued' - we cannot send without an email address.
    return fail<ReminderEventDTO>(
      "Could not resolve student email address. Reminder not sent."
    )
  }

  // Resolve course title and slug if this reminder is course-specific.
  let courseTitle: string | null = null
  let courseSlug: string | null = null
  if (reminder.course_id) {
    const { data: course } = await supabase
      .from("courses")
      .select("title, slug")
      .eq("id", reminder.course_id)
      .single()
    courseTitle = course?.title ?? null
    courseSlug = course?.slug ?? null
  }

  // Build the localized course link.
  const siteUrl = getSiteUrl()
  const courseLink =
    courseSlug ? `${siteUrl}/${locale}/courses/${courseSlug}` : siteUrl

  // Compose localized email content.
  const t = await getTranslations({ locale, namespace: "Reminders" })

  const subject = courseTitle
    ? t("email.subjectWithCourse", { course: courseTitle })
    : t("email.subject")

  const greeting = fullName
    ? t("email.greetingName", { name: fullName })
    : t("email.greeting")
  const body = courseTitle
    ? t("email.bodyWithCourse", { course: courseTitle, link: courseLink })
    : t("email.body", { link: courseLink })
  const closing = t("email.closing")

  const text = `${greeting}\n\n${body}\n\n${closing}`
  const html = `<p>${greeting}</p><p>${body}</p><p>${closing}</p>`

  const sendResult = await sendEmail({
    to: toEmail,
    subject,
    text,
    html,
  })

  if (!sendResult.ok) {
    // Mark failed so the admin knows the attempt was made.
    await supabase
      .from("reminder_events")
      .update({ status: "failed" })
      .eq("id", reminderId)

    revalidatePath("/admin/reminders", "page")

    return fail<ReminderEventDTO>(sendResult.message)
  }

  // Mark sent with timestamp.
  const updateResult = await markReminderStatus(reminderId, "sent")
  if (!updateResult.ok) {
    return fail<ReminderEventDTO>("Reminder sent but failed to update status.")
  }

  revalidatePath("/admin/reminders", "page")

  return ok<ReminderEventDTO>(updateResult.data)
}
