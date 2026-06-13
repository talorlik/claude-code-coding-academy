import { getTranslations, setRequestLocale } from "next-intl/server"
import type { Metadata } from "next"

import { requireUser } from "@/lib/auth/require-user"
import { getIsAdmin } from "@/lib/auth/guards"
import { Link } from "@/i18n/navigation"
import type { Locale } from "@/i18n/routing"
import {
  getEnrolledCoursesWithProgress,
  getWeeklyProgressSummary,
  getRecentlyWatchedLessons,
  getAchievementBadges,
} from "@/lib/dashboard/student-queries"
import { getMyCertificates } from "@/lib/certificates/queries"
import { EnrolledCourseRow } from "@/components/dashboard/enrolled-course-row"
import { AchievementBadge } from "@/components/dashboard/achievement-badge"
import { RecentlyWatchedList } from "@/components/dashboard/recently-watched-list"
import { WeeklyProgressChart } from "@/components/dashboard/weekly-progress-chart"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "DashboardStudent" })
  return {
    title: t("pageTitle"),
    robots: { index: false, follow: false },
  }
}

/**
 * Student dashboard page. Requires authentication via `requireUser()`.
 *
 * Fetches all dashboard data server-side and passes minimal props to client
 * islands (WeeklyProgressChart). No private student data is exposed to the
 * client beyond what is needed for display.
 */
export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale as Locale)

  const userId = await requireUser()

  const [t, courses, weeklyData, recentLessons, badges, isAdmin, certificates] =
    await Promise.all([
      getTranslations("DashboardStudent"),
      getEnrolledCoursesWithProgress(userId),
      getWeeklyProgressSummary(userId),
      getRecentlyWatchedLessons(userId, 5),
      getAchievementBadges(userId),
      getIsAdmin(),
      getMyCertificates(userId),
    ])

  const { days, totalCount } = weeklyData

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-3xl min-w-0 px-4 py-8"
    >
      {/* Greeting */}
      <section aria-labelledby="dashboard-heading" className="mb-8">
        <h1
          id="dashboard-heading"
          className="text-2xl font-semibold text-foreground"
        >
          {t("greeting")}
        </h1>
        {isAdmin && (
          <p className="mt-1 text-sm text-muted-foreground">
            {t("youAreInstructor")}{" "}
            <Link
              href="/admin/dashboard"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {t("goToAdminDashboard")}
            </Link>
          </p>
        )}
      </section>

      {/* Enrolled courses */}
      <section
        aria-labelledby="enrolled-courses-heading"
        className="mb-8 flex flex-col gap-3"
      >
        <h2
          id="enrolled-courses-heading"
          className="text-lg font-semibold text-foreground"
        >
          {t("enrolledCourses")}
        </h2>
        {courses.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {t("noEnrollments")}
            </p>
            <Link
              href="/courses"
              className="mt-3 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t("browseCatalog")}
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {courses.map((course) => (
              <EnrolledCourseRow key={course.enrollmentId} course={course} />
            ))}
          </ul>
        )}
      </section>

      {/* Weekly progress */}
      <section
        aria-labelledby="weekly-progress-heading"
        className="mb-8 flex flex-col gap-3"
      >
        <h2
          id="weekly-progress-heading"
          className="text-lg font-semibold text-foreground"
        >
          {t("weeklyProgress")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("lessonsThisWeek", { count: totalCount })}
        </p>
        {/* Chart rendered only when 2+ distinct active days exist; otherwise
            the stat line above is sufficient. */}
        <WeeklyProgressChart days={days} />
      </section>

      {/* Recently watched */}
      <section
        aria-labelledby="recent-lessons-heading"
        className="mb-8 flex flex-col gap-3"
      >
        <h2
          id="recent-lessons-heading"
          className="text-lg font-semibold text-foreground"
        >
          {t("recentlyWatched")}
        </h2>
        <RecentlyWatchedList lessons={recentLessons} />
      </section>

      {/* My Certificates */}
      <section
        aria-labelledby="certificates-heading"
        className="mb-8 flex flex-col gap-3"
      >
        <div className="flex min-w-0 items-center justify-between gap-2">
          <h2
            id="certificates-heading"
            className="text-lg font-semibold text-foreground"
          >
            {t("myCertificates")}
          </h2>
          {certificates.length > 0 && (
            <Link
              href="/certificates"
              className="shrink-0 text-sm text-primary hover:underline"
            >
              {t("viewAllCertificates")}
            </Link>
          )}
        </div>
        {certificates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("noCertificates")}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {certificates.slice(0, 3).map((cert) => {
              const meta = (cert as { metadata?: { courseTitle?: string; courseSlug?: string } | null }).metadata
              const courseSlug = meta?.courseSlug ?? cert.courseId
              const courseTitle = meta?.courseTitle ?? cert.courseId
              return (
                <li key={cert.id}>
                  <Link
                    href={`/certificates/${courseSlug}`}
                    className="inline-flex items-center gap-2 text-sm text-foreground hover:text-primary hover:underline"
                  >
                    <span aria-hidden="true">🏅</span>
                    {courseTitle}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Achievement badges */}
      <section
        aria-labelledby="badges-heading"
        className="mb-8 flex flex-col gap-3"
      >
        <h2
          id="badges-heading"
          className="text-lg font-semibold text-foreground"
        >
          {t("achievements")}
        </h2>
        <ul
          className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          {badges.map((badge) => (
            <AchievementBadge
              key={badge.id}
              id={badge.id}
              earned={badge.earned}
            />
          ))}
        </ul>
      </section>
    </main>
  )
}
