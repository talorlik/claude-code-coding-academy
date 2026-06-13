import { useTranslations } from "next-intl"

import {
  Progress,
  ProgressLabel,
} from "@/components/ui/progress"
import type { CourseProgress } from "@/lib/progress/types"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CourseProgressBarProps {
  progress: CourseProgress
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Displays a course completion progress bar with an accessible label and
 * a "X of Y lessons" count.
 *
 * Uses the Base UI Progress primitive via {@link Progress} which provides
 * aria-valuenow, aria-valuemin, aria-valuemax, and role="progressbar" on the
 * underlying track element.
 *
 * The lesson count label is rendered as a plain span next to the ProgressLabel
 * to avoid the render-prop API of ProgressValue.
 */
export function CourseProgressBar({ progress }: CourseProgressBarProps) {
  const t = useTranslations("Course")

  const lessonCountLabel = t("progressLessons", {
    completed: progress.completedLessons,
    total: progress.totalLessons,
  })

  return (
    <Progress
      value={progress.percent}
      aria-label={t("progressLabel")}
      className="gap-1"
    >
      <ProgressLabel>{t("progressLabel")}</ProgressLabel>
      <span className="ms-auto text-xs text-muted-foreground tabular-nums">
        {lessonCountLabel}
      </span>
    </Progress>
  )
}
