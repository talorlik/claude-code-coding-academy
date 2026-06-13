import { useTranslations } from "next-intl"

import { Link } from "@/i18n/navigation"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import type { EnrolledCourseWithProgress } from "@/lib/dashboard/student-queries"

interface EnrolledCourseRowProps {
  course: EnrolledCourseWithProgress
}

/**
 * Renders one enrolled course with a progress bar and a continue link.
 * Used in the student dashboard enrolled courses list.
 */
export function EnrolledCourseRow({ course }: EnrolledCourseRowProps) {
  const t = useTranslations("DashboardStudent")

  const isComplete = course.completedLessons > 0 && course.completedLessons >= course.totalLessons

  return (
    <li className="flex min-w-0 flex-col gap-2 rounded-lg border bg-card p-4">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <span className="min-w-0 truncate font-medium text-foreground">
          {course.courseTitle}
        </span>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {isComplete && (
            <Badge variant="default" className="shrink-0">
              {t("completed")}
            </Badge>
          )}
          <Link
            href={`/courses/${course.courseSlug}`}
            className="shrink-0 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            {isComplete ? t("reviewCourse") : t("continueCourse")}
          </Link>
        </div>
      </div>

      <div className="space-y-1">
        <Progress
          value={course.percent}
          aria-label={t("progressLabel", { title: course.courseTitle })}
          className="h-2"
        />
        <span className="text-xs text-muted-foreground tabular-nums">
          {t("progressLessons", {
            completed: course.completedLessons,
            total: course.totalLessons,
          })}
        </span>
      </div>
    </li>
  )
}
