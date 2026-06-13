import { getTranslations, setRequestLocale } from "next-intl/server"
import type { Metadata } from "next"
import { PlusIcon } from "lucide-react"

import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { AdminCourseTable } from "@/components/admin/admin-course-table"
import { listAllCourses } from "@/lib/admin/queries"
import type { Locale } from "@/i18n/routing"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Admin" })
  return { title: t("courseList.heading") }
}

/**
 * Admin course list page. Guarded by the admin layout; requireInstructor()
 * already ran before this page renders.
 *
 * Displays all courses (draft + published + archived) with lesson counts.
 * Instructors can create new courses, edit existing ones, manage lessons, or
 * delete courses.
 */
export default async function AdminCoursesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale as Locale)

  const [t, courses] = await Promise.all([
    getTranslations("Admin"),
    listAllCourses(),
  ])

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t("courseList.heading")}</h1>
        <Button render={<Link href="/admin/courses/new" />} size="sm">
          <PlusIcon className="me-2 h-4 w-4" aria-hidden="true" />
          {t("courseList.newCourse")}
        </Button>
      </div>

      <AdminCourseTable courses={courses} />
    </>
  )
}
