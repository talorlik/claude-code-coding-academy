import { getTranslations, setRequestLocale } from "next-intl/server"
import type { Metadata } from "next"

import { requireAdmin } from "@/lib/auth/guards"
import type { Locale } from "@/i18n/routing"
import {
  getAdminOverviewStats,
  getCourseCompletionRates,
  getStuckStudents,
  getCommonTutorQuestions,
  getRecentCourseActivity,
} from "@/lib/dashboard/admin-queries"
import { AdminStatCards } from "@/components/dashboard/admin-stat-cards"
import { AdminCompletionTable } from "@/components/dashboard/admin-completion-table"
import { AdminStuckStudents } from "@/components/dashboard/admin-stuck-students"
import { AdminCommonQuestions } from "@/components/dashboard/admin-common-questions"
import { AdminActivityFeed } from "@/components/dashboard/admin-activity-feed"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "DashboardAdmin" })
  return { title: t("pageTitle") }
}

/**
 * Admin/instructor analytics dashboard.
 *
 * The admin layout already guards this route with `requireInstructor()`.
 * This page also calls `requireAdmin()` from guards.ts as defense in depth -
 * belt-and-suspenders for pages that contain sensitive aggregate analytics.
 *
 * All data is fetched server-side. No student PII is passed to client
 * components - only aggregate counts and anonymizable display strings.
 */
export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale as Locale)

  // Defense-in-depth: admin layout already checked, this re-checks.
  await requireAdmin()

  const [
    t,
    stats,
    completionRates,
    stuckStudents,
    commonQuestions,
    recentActivity,
  ] = await Promise.all([
    getTranslations("DashboardAdmin"),
    getAdminOverviewStats().catch((e) => {
      console.error("[admin/dashboard] getAdminOverviewStats:", e)
      return null
    }),
    getCourseCompletionRates().catch(() => []),
    getStuckStudents().catch(() => []),
    getCommonTutorQuestions(10).catch(() => []),
    getRecentCourseActivity(10).catch(() => []),
  ])

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{t("pageTitle")}</h1>
      </div>

      {/* Overview stat cards */}
      <section
        aria-labelledby="overview-stats-heading"
        className="mb-8 flex flex-col gap-4"
      >
        <h2
          id="overview-stats-heading"
          className="text-base font-semibold text-foreground"
        >
          {t("overview")}
        </h2>
        {stats ? (
          <AdminStatCards stats={stats} />
        ) : (
          <p className="text-sm text-muted-foreground">{t("errorLoading")}</p>
        )}
      </section>

      {/* Course completion rates */}
      <section
        aria-labelledby="completion-rates-heading"
        className="mb-8 flex flex-col gap-4"
      >
        <h2
          id="completion-rates-heading"
          className="text-base font-semibold text-foreground"
        >
          {t("courseCompletionRates")}
        </h2>
        <AdminCompletionTable courses={completionRates} />
      </section>

      {/* Stuck students */}
      <section
        aria-labelledby="stuck-students-heading"
        className="mb-8 flex flex-col gap-4"
      >
        <h2
          id="stuck-students-heading"
          className="text-base font-semibold text-foreground"
        >
          {t("stuckStudents")}
        </h2>
        <p className="text-xs text-muted-foreground">{t("stuckStudentsNote")}</p>
        <AdminStuckStudents students={stuckStudents} />
      </section>

      {/* Common AI tutor questions */}
      <section
        aria-labelledby="tutor-questions-heading"
        className="mb-8 flex flex-col gap-4"
      >
        <h2
          id="tutor-questions-heading"
          className="text-base font-semibold text-foreground"
        >
          {t("commonTutorQuestions")}
        </h2>
        <AdminCommonQuestions questions={commonQuestions} />
      </section>

      {/* Recent activity */}
      <section
        aria-labelledby="recent-activity-heading"
        className="mb-8 flex flex-col gap-4"
      >
        <h2
          id="recent-activity-heading"
          className="text-base font-semibold text-foreground"
        >
          {t("recentActivity")}
        </h2>
        <AdminActivityFeed items={recentActivity} />
      </section>
    </>
  )
}
