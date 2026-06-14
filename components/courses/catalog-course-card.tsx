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
 * reflecting `average` (rounded to the nearest half via a half-step clamp), the
 * numeric average, and the review count. When `average` is null (no reviews) it
 * renders a muted "no ratings yet" label instead - never zero stars, which
 * would read as a 1-star course.
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
                ? "size-3.5 fill-amber-400 text-amber-400"
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
 * Catalog variant of the course card. Extends the home-page card contract with
 * a star-rating display and, when the viewer is enrolled, an inline progress
 * bar. Kept separate from {@link CourseCard} so the home page card is never
 * burdened with catalog-only aggregates; both share {@link EnrollmentButton}
 * and the same level-badge mapping.
 *
 * Server component (the interactive bits live in EnrollmentButton and the
 * client Progress primitive). Mobile-first and RTL-safe: the card is a
 * shrinkable flex column, badges/rating rows wrap, and the title/description
 * clamp.
 */
export async function CatalogCourseCard({
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
