import { getTranslations } from "next-intl/server"
import { BookOpen, Star } from "lucide-react"

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Link } from "@/i18n/navigation"
import type { CourseLevel } from "@/lib/courses/types"
import type { CatalogCourse } from "@/lib/catalog/types"
import { EnrollmentButton } from "./enrollment-button"

const LEVEL_VARIANT: Record<CourseLevel, "default" | "secondary" | "outline"> = {
  beginner: "secondary",
  intermediate: "default",
  advanced: "outline",
}

/**
 * A 0-5 star rating display. Renders five star glyphs with the filled portion
 * reflecting `average`, the numeric average, and the review count. When
 * `average` is null (no reviews) it renders a muted "no ratings yet" label
 * instead - never zero stars, which would read as a 1-star course.
 */
async function RatingStars({
  average,
  count,
}: {
  average: number | null
  count: number
}) {
  const t = await getTranslations("Catalog")

  if (average === null || count === 0) {
    return (
      <span className="text-xs text-muted-foreground">{t("noRatings")}</span>
    )
  }

  const rounded = Math.round(average)
  return (
    <span
      className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground"
      aria-label={t("ratingLabel", { average: average.toFixed(1), count })}
    >
      <span className="flex shrink-0" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={
              i <= rounded
                ? "size-3.5 fill-brand-accent text-brand-accent"
                : "size-3.5 text-muted-foreground/40"
            }
          />
        ))}
      </span>
      <span className="tabular-nums">{average.toFixed(1)}</span>
      <span>({count})</span>
    </span>
  )
}

/**
 * The course card used everywhere a course is presented in a grid - the home
 * page's "newest courses" section and the `/courses` catalog both render it, so
 * a course looks identical wherever it appears. It shows the cover image (or a
 * fallback), level + category badges, lesson count, a star-rating display, and
 * an enrollment / continue CTA; for a signed-in viewer enrolled in the course
 * it also shows an inline progress bar.
 *
 * Server component (the interactive bits live in {@link EnrollmentButton} and
 * the client Progress primitive). Takes a {@link CatalogCourse}, the DTO both
 * `getCatalog` and the home loader produce, so there is a single card contract.
 * `ratingAverage`/`progressPercent` are null-safe: no reviews renders "no
 * ratings yet", and the progress bar only renders when enrolled.
 *
 * Mobile-first and RTL-safe: a shrinkable flex column, wrapping badge/rating
 * rows, and clamped title/description.
 */
export async function CourseCard({
  course,
  userId,
}: {
  course: CatalogCourse
  userId: string | null
}) {
  const t = await getTranslations("Courses")
  const tCatalog = await getTranslations("Catalog")

  const levelLabel = t(`level.${course.level}`)
  const lessonLabel = t("lessonCount", { count: course.lessonCount })
  const courseHref = `/courses/${course.slug}` as const

  return (
    <Card className="flex min-w-0 flex-col">
      <div className="relative aspect-video w-full overflow-hidden rounded-t-xl bg-gradient-to-br from-primary/20 to-primary/5">
        {course.coverImageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={course.coverImageUrl}
            alt={course.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            aria-hidden="true"
          >
            <BookOpen className="size-12 text-primary/40" />
          </div>
        )}
      </div>

      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={LEVEL_VARIANT[course.level]}>{levelLabel}</Badge>
          {course.categoryName ? (
            <Badge variant="outline">{course.categoryName}</Badge>
          ) : null}
          <span className="text-xs text-muted-foreground">{lessonLabel}</span>
        </div>
        <CardTitle className="line-clamp-2">
          <Link
            href={courseHref}
            className="hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {course.title}
          </Link>
        </CardTitle>
        <RatingStars average={course.ratingAverage} count={course.ratingCount} />
        <CardDescription className="line-clamp-3">
          {course.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="mt-auto">
        {course.isEnrolled && course.progressPercent !== null ? (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">
              {tCatalog("progressLabel", { percent: course.progressPercent })}
            </span>
            <Progress
              value={course.progressPercent}
              aria-label={tCatalog("progressLabel", {
                percent: course.progressPercent,
              })}
            />
          </div>
        ) : null}
      </CardContent>

      <CardFooter>
        <EnrollmentButton
          courseId={course.id}
          courseSlug={course.slug}
          userId={userId}
          isEnrolled={course.isEnrolled}
        />
      </CardFooter>
    </Card>
  )
}
