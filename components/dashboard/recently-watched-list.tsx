import { useTranslations } from "next-intl"

import { Link } from "@/i18n/navigation"
import type { RecentlyWatchedLesson } from "@/lib/dashboard/student-queries"

interface RecentlyWatchedListProps {
  lessons: RecentlyWatchedLesson[]
}

/**
 * Renders a list of recently watched lessons as a simple linked list.
 * Each item links to the lesson page within its course.
 */
export function RecentlyWatchedList({ lessons }: RecentlyWatchedListProps) {
  const t = useTranslations("DashboardStudent")

  if (lessons.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("noRecentLessons")}</p>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {lessons.map((lesson) => (
        <li
          key={`${lesson.courseId}-${lesson.lessonId}`}
          className="flex min-w-0 items-center justify-between gap-2 rounded-md border bg-card px-3 py-2"
        >
          <div className="min-w-0">
            <Link
              href={`/courses/${lesson.courseSlug}/${lesson.lessonSlug}`}
              className="block truncate text-sm font-medium text-foreground hover:underline"
            >
              {lesson.lessonTitle}
            </Link>
            <span className="block truncate text-xs text-muted-foreground">
              {lesson.courseTitle}
            </span>
          </div>
          <time
            dateTime={lesson.watchedAt}
            className="shrink-0 text-xs tabular-nums text-muted-foreground"
            title={lesson.watchedAt}
          >
            {new Date(lesson.watchedAt).toLocaleDateString()}
          </time>
        </li>
      ))}
    </ul>
  )
}
