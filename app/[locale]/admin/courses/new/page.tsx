import { getTranslations, setRequestLocale } from "next-intl/server"
import type { Metadata } from "next"

import { AdminCourseForm } from "@/components/admin/admin-course-form"
import type { Locale } from "@/i18n/routing"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Admin" })
  return { title: t("courseForm.createTitle") }
}

/**
 * Create new course page. Admin layout already called requireInstructor().
 */
export default async function NewCoursePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale as Locale)

  const t = await getTranslations("Admin")

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">{t("courseForm.createTitle")}</h1>
      <div className="max-w-2xl">
        <AdminCourseForm mode="create" />
      </div>
    </>
  )
}
