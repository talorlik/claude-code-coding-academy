import { getTranslations } from "next-intl/server"
import { BookOpen } from "lucide-react"

import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import type { CatalogCourse } from "@/lib/catalog/types"
import { CourseCard } from "./course-card"

/**
 * The shared course grid, rendered by both the home page ("newest courses")
 * and the `/courses` catalog so a course list looks identical wherever it
 * appears. Renders the unified {@link CourseCard} per course, or a localized
 * empty state when the list is empty.
 *
 * Server component (the cards are async server components). Responsive grid:
 * 1 column on mobile, 2 on sm, 3 on lg; each child is `min-w-0` so content can
 * shrink without forcing horizontal overflow.
 *
 * @param props.courses - The courses to render, already filtered/sorted/sliced
 *   by the caller.
 * @param props.userId - The viewer's id, or null for an anonymous visitor.
 * @param props.ariaLabel - Accessible name for the grid's `list` role.
 */
export async function CourseCatalog({
  courses,
  userId,
  ariaLabel,
}: {
  courses: CatalogCourse[]
  userId: string | null
  ariaLabel: string
}) {
  const t = await getTranslations("Courses")

  if (courses.length === 0) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BookOpen aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>{t("empty.title")}</EmptyTitle>
          <EmptyDescription>{t("empty.body")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
      role="list"
      aria-label={ariaLabel}
    >
      {courses.map((course) => (
        <div key={course.id} className="min-w-0" role="listitem">
          <CourseCard course={course} userId={userId} />
        </div>
      ))}
    </div>
  )
}
