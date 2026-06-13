import { useTranslations } from "next-intl"
import { BookOpen } from "lucide-react"

import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import type { CourseSummary } from "@/lib/courses/types"
import { CourseCard } from "./course-card"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CourseCatalogProps {
  courses: CourseSummary[]
  /** Authenticated user id, or null for anonymous visitors. */
  userId: string | null
  /** Set of course IDs the user is enrolled in. */
  enrolledCourseIds: Set<string>
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Renders the course grid or an empty-state when no courses are published.
 *
 * The grid is responsive: 1 column on mobile, 2 on sm, 3 on lg.
 * Each grid child has min-w-0 so flex content can shrink without overflow.
 */
export function CourseCatalog({
  courses,
  userId,
  enrolledCourseIds,
}: CourseCatalogProps) {
  const t = useTranslations("Courses")

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
      aria-label="Course catalog"
    >
      {courses.map((course) => (
        <div key={course.id} className="min-w-0" role="listitem">
          <CourseCard
            course={course}
            userId={userId}
            isEnrolled={enrolledCourseIds.has(course.id)}
          />
        </div>
      ))}
    </div>
  )
}
