import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { requireAdmin } from "@/lib/auth/guards"
import {
  identifyInactiveStudents,
  listReminderEvents,
} from "@/lib/reminders/queries"
import { queueReminder } from "@/lib/reminders/actions"
import { ReminderSendButton } from "@/components/admin/reminder-send-button"
import type { Locale } from "@/i18n/routing"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Reminders" })
  return { title: t("pageTitle") }
}

/**
 * Admin reminders page.
 *
 * Sections:
 * 1. Inactive students (from admin_stuck_students view): list with a
 *    "Queue Reminder" button per row.
 * 2. Reminder queue: current reminder_events table, showing status.
 *
 * Delivery: EMAIL_PROVIDER_API_KEY is NOT configured. Reminders are queued
 * with status='queued' and shown in the queue table. When a provider is
 * configured, the queueReminder action would call the provider API and set
 * status='sent'. This is documented in the UI with a notice banner.
 */
export default async function AdminRemindersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ notice?: string; error?: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale as Locale)

  await requireAdmin()

  const [t, inactiveStudents, reminderEvents] = await Promise.all([
    getTranslations("Reminders"),
    identifyInactiveStudents(),
    listReminderEvents(50),
  ])

  const { notice, error } = await searchParams

  async function handleQueueReminder(formData: FormData) {
    "use server"
    const userId = formData.get("userId") as string
    const courseId = (formData.get("courseId") as string) || null
    const reason = (formData.get("reason") as string) || "inactive"

    const result = await queueReminder(userId, courseId, reason)
    const { redirect } = await import("@/i18n/navigation")
    const locale2 = await import("next-intl/server").then((m) => m.getLocale())
    const base = `/admin/reminders`
    if (result.ok) {
      return redirect({ href: `${base}?notice=queued`, locale: locale2 })
    }
    return redirect({
      href: `${base}?error=${encodeURIComponent(result.message)}`,
      locale: locale2,
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-2xl font-semibold text-foreground">
        {t("pageTitle")}
      </h1>

      {/* Provider notice - shown only when SMTP is not configured in this env.
          The banner is informational only; the Send button degrades gracefully. */}
      {process.env.SMTP_HOST ? null : (
        <div
          role="note"
          className="rounded-md border border-border bg-muted px-4 py-3 text-sm text-muted-foreground"
        >
          {t("providerNote")}
        </div>
      )}

      {notice === "queued" && (
        <div
          role="status"
          className="rounded-md bg-success px-4 py-3 text-sm text-success-foreground"
        >
          {t("queueSuccess")}
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {decodeURIComponent(error)}
        </div>
      )}

      {/* Inactive students */}
      <section aria-labelledby="inactive-heading">
        <h2
          id="inactive-heading"
          className="mb-2 text-base font-semibold text-foreground"
        >
          {t("inactiveStudents")}
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">{t("inactiveNote")}</p>

        {inactiveStudents.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noInactive")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] border-collapse text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 pe-4 text-start font-medium text-muted-foreground">
                    {t("student")}
                  </th>
                  <th className="py-2 pe-4 text-start font-medium text-muted-foreground">
                    {t("course")}
                  </th>
                  <th className="py-2 pe-4 text-start font-medium text-muted-foreground">
                    {t("daysInactive")}
                  </th>
                  <th className="py-2 text-start font-medium text-muted-foreground">
                    {t("queueReminder")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {inactiveStudents.map((student) => (
                  <tr
                    key={`${student.userId}-${student.courseId}`}
                    className="border-b"
                  >
                    <td className="max-w-[150px] truncate py-2 pe-4 font-mono text-xs">
                      {student.userId.slice(0, 8)}...
                    </td>
                    <td className="max-w-[150px] truncate py-2 pe-4 font-mono text-xs">
                      {student.courseId?.slice(0, 8)}...
                    </td>
                    <td className="py-2 pe-4">
                      {student.daysInactive}
                    </td>
                    <td className="py-2">
                      <form action={handleQueueReminder}>
                        <input
                          type="hidden"
                          name="userId"
                          value={student.userId}
                        />
                        <input
                          type="hidden"
                          name="courseId"
                          value={student.courseId ?? ""}
                        />
                        <input
                          type="hidden"
                          name="reason"
                          value={`inactive_${student.daysInactive}_days`}
                        />
                        <button
                          type="submit"
                          className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                        >
                          {t("queueReminder")}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Reminder queue */}
      <section aria-labelledby="queue-heading">
        <h2
          id="queue-heading"
          className="mb-4 text-base font-semibold text-foreground"
        >
          {t("reminderQueue")}
        </h2>

        {reminderEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noReminders")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] border-collapse text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-2 pe-4 text-start font-medium text-muted-foreground">
                    {t("student")}
                  </th>
                  <th className="py-2 pe-4 text-start font-medium text-muted-foreground">
                    {t("reason")}
                  </th>
                  <th className="py-2 pe-4 text-start font-medium text-muted-foreground">
                    {t("status")}
                  </th>
                  <th className="py-2 pe-4 text-start font-medium text-muted-foreground">
                    {t("createdAt")}
                  </th>
                  <th className="py-2 text-start font-medium text-muted-foreground">
                    {t("actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {reminderEvents.map((event) => (
                  <tr key={event.id} className="border-b">
                    <td className="max-w-[150px] truncate py-2 pe-4 font-mono text-xs">
                      {event.userId.slice(0, 8)}...
                    </td>
                    <td className="max-w-[200px] truncate py-2 pe-4 text-xs">
                      {event.reason}
                    </td>
                    <td className="py-2 pe-4">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          event.status === "sent"
                            ? "bg-success text-success-foreground"
                            : event.status === "queued"
                              ? "bg-muted text-muted-foreground"
                              : event.status === "failed"
                                ? "bg-[var(--color-danger-bg)] text-[var(--color-danger-text)]"
                                : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {event.status}
                      </span>
                    </td>
                    <td className="py-2 pe-4 text-xs text-muted-foreground">
                      {event.createdAt.slice(0, 10)}
                    </td>
                    <td className="py-2">
                      {event.status === "queued" || event.status === "failed" ? (
                        <ReminderSendButton reminderId={event.id} />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
