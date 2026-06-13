import { notFound } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"
import type { Metadata } from "next"
import { ArrowLeftIcon } from "lucide-react"

import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { AdminLessonList } from "@/components/admin/admin-lesson-list"
import { AddLessonForm } from "@/components/admin/add-lesson-form"
import { YouTubePlaylistImport } from "@/components/admin/youtube-playlist-import"
import { getCourseForEdit, listLessonsForCourse } from "@/lib/admin/queries"
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
  return {
    title: course
      ? `${t("lessonList.heading")}: ${course.title}`
      : t("lessonList.heading"),
  }
}

/**
 * Lesson management page for a course. Admin layout already called
 * requireInstructor(). Shows the lesson list with reorder/edit/delete actions
 * and the add-lesson-from-URL form.
 */
export default async function CourseLessonsPage({
  params,
}: {
  params: Promise<{ locale: string; courseId: string }>
}) {
  const { locale, courseId } = await params
  setRequestLocale(locale as Locale)

  const [t, course, lessons] = await Promise.all([
    getTranslations("Admin"),
    getCourseForEdit(courseId),
    listLessonsForCourse(courseId),
  ])

  if (!course) notFound()

  return (
    <>
      <div className="mb-2">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href="/admin/courses" />}
          className="mb-4"
        >
          <ArrowLeftIcon className="me-2 h-4 w-4" aria-hidden="true" />
          {t("lessonList.backToCourses")}
        </Button>
      </div>

      <h1 className="mb-1 text-2xl font-semibold">
        {t("lessonList.heading")}: {course.title}
      </h1>
      <p className="mb-8 text-sm text-muted-foreground">/{course.slug}</p>

      <div className="flex flex-col gap-10">
        <section aria-label={t("addLessonForm.heading")}>
          <h2 className="mb-4 text-lg font-medium">{t("addLessonForm.heading")}</h2>
          <AddLessonForm courseId={courseId} />
        </section>

        <section aria-label={t("playlistImport.heading")}>
          <h2 className="mb-4 text-lg font-medium">{t("playlistImport.heading")}</h2>
          <YouTubePlaylistImport courseId={courseId} />
        </section>

        <section aria-label={t("lessonList.heading")}>
          <h2 className="mb-4 text-lg font-medium">{t("lessonList.heading")}</h2>
          <AdminLessonList courseId={courseId} lessons={lessons} />
        </section>
      </div>
    </>
  )
}
