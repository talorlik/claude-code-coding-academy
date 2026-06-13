"use client"

import { useTransition } from "react"
import { useTranslations } from "next-intl"
import { CheckCircle2 } from "lucide-react"

import { useRouter } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { markLessonWatched } from "@/lib/progress/actions"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MarkWatchedButtonProps {
  courseId: string
  lessonId: string
  courseSlug: string
  /** Slug of the next incomplete lesson, or null when this is the last. */
  nextLessonSlug: string | null
  /** Whether this lesson has already been marked watched. */
  isWatched: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Client component that calls the markLessonWatched server action via
 * useTransition. On success:
 * - If a next lesson exists: navigates to `?lesson=<nextSlug>`.
 * - If this was the final lesson: reloads the page so the server re-renders
 *   the completion state.
 *
 * When already watched, renders a static "Watched" indicator instead of a
 * clickable button.
 *
 * The button is disabled and aria-busy=true while the transition is pending.
 */
export function MarkWatchedButton({
  courseId,
  lessonId,
  courseSlug,
  nextLessonSlug,
  isWatched,
}: MarkWatchedButtonProps) {
  const t = useTranslations("Course")
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  if (isWatched) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <span>{t("watched")}</span>
      </div>
    )
  }

  function handleMarkWatched() {
    startTransition(async () => {
      const result = await markLessonWatched({ courseId, lessonId })

      if (!result.ok) {
        // Server logged the error. No toast layer yet (batch 12).
        // The button returns to idle state silently.
        console.error("[mark-watched-button]", result.message)
        return
      }

      if (result.data.courseCompleted || !nextLessonSlug) {
        // Final lesson completed: reload to show the completion panel
        // rendered by the server component.
        router.refresh()
      } else {
        // Navigate to the next lesson via search param.
        router.push(`/courses/${courseSlug}?lesson=${nextLessonSlug}`)
      }
    })
  }

  return (
    <Button
      onClick={handleMarkWatched}
      disabled={isPending}
      aria-busy={isPending}
      variant="default"
      size="sm"
    >
      {isPending ? t("markingWatched") : t("markWatched")}
    </Button>
  )
}
