import { notFound } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"
import type { Metadata } from "next"

import { AdminCourseForm } from "@/components/admin/admin-course-form"
import { getCourseForEdit } from "@/lib/admin/queries"
import type { Locale } from "@/i18n/routing"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; courseId: string }>
}): Promise<Metadata> {
  const { locale, courseId } = await params
  const [t, course] = await Promise.all([
    getTranslations({ locale, namespace: "Admin" }),
    getCourseForEdit(courseId),
  ])
  return { title: course ? `${t("courseForm.editTitle")}: ${course.title}` : t("courseForm.editTitle") }
}

/**
 * Edit existing course page. Admin layout already called requireInstructor().
 */
export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ locale: string; courseId: string }>
}) {
  const { locale, courseId } = await params
  setRequestLocale(locale as Locale)

  const [t, course] = await Promise.all([
    getTranslations("Admin"),
    getCourseForEdit(courseId),
  ])

  if (!course) notFound()

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">{t("courseForm.editTitle")}</h1>
      <div className="max-w-2xl">
        <AdminCourseForm
          mode="edit"
          courseId={courseId}
          defaultValues={{
            title: course.title,
            slug: course.slug,
            description: course.description,
            level: course.level,
            status: course.status,
            language: course.language,
            coverImageUrl: course.coverImageUrl ?? "",
          }}
        />
      </div>
    </>
  )
}
