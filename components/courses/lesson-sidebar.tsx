import { CheckCircle2 } from "lucide-react"
import { useTranslations } from "next-intl"

import { Link } from "@/i18n/navigation"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { LessonSummary } from "@/lib/courses/types"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LessonSidebarProps {
  /** Ordered lessons to display. */
  lessons: LessonSummary[]
  /** Slug of the currently selected lesson. */
  activeSlug: string
  /** Course slug used to build lesson hrefs. */
  courseSlug: string
  /** Set of completed lesson ids for this user. Empty set for anon/unenrolled. */
  completedLessonIds: Set<string>
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Ordered lesson list rendered as an accessible nav landmark. Each lesson is a
 * link to `?lesson=<slug>`, preserving locale via the i18n Link. Completed
 * lessons display a CheckCircle2 icon with sr-only "Completed" text. The active
 * lesson carries aria-current="true" and a distinct background style.
 *
 * Preview lessons show a "Preview" badge so anon users know which lessons they
 * can watch without enrolling.
 *
 * This component is a server component (no "use client" directive needed).
 * It is reused inside the mobile Sheet and as the persistent desktop sidebar.
 */
export function LessonSidebar({
  lessons,
  activeSlug,
  courseSlug: _courseSlug,
  completedLessonIds,
}: LessonSidebarProps) {
  const t = useTranslations("Course")

  if (lessons.length === 0) {
    return (
      <nav aria-label={t("lessonListLabel")}>
        <p className="px-3 py-4 text-sm text-muted-foreground">
          {t("noLessons")}
        </p>
      </nav>
    )
  }

  return (
    <nav aria-label={t("lessonListLabel")}>
      <ol className="flex flex-col gap-0.5 py-2">
        {lessons.map((lesson, index) => {
          const isActive = lesson.slug === activeSlug
          const isCompleted = completedLessonIds.has(lesson.id)

          return (
            <li key={lesson.id}>
              <Link
                href={`/courses/${_courseSlug}?lesson=${lesson.slug}`}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "flex min-w-0 items-start gap-3 rounded-md px-3 py-2.5",
                  "text-sm transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "bg-accent font-medium text-accent-foreground"
                    : "text-foreground"
                )}
              >
                {/* Lesson index number */}
                <span
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center",
                    "rounded-full text-xs font-semibold",
                    isCompleted
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                  aria-hidden="true"
                >
                  {isCompleted ? (
                    <CheckCircle2 className="size-4 text-primary" aria-hidden="true" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </span>

                {/* Lesson title + badges */}
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <span className="min-w-0 break-words leading-snug">
                      {lesson.title}
                    </span>
                    {lesson.isPreview && (
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        {t("previewBadge")}
                      </Badge>
                    )}
                  </span>
                  {isCompleted && (
                    <span className="sr-only">{t("completedLabel")}</span>
                  )}
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
