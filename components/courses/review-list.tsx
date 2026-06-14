import { getTranslations } from "next-intl/server"
import { Star } from "lucide-react"

import type { CourseReview } from "@/lib/courses/types"

/**
 * A static 1-5 star row for a single review's rating. Decorative (the numeric
 * rating is in the surrounding text / aria), so the glyphs are aria-hidden.
 */
function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex shrink-0" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={
            i <= rating
              ? "size-4 fill-amber-400 text-amber-400"
              : "size-4 text-muted-foreground/40"
          }
        />
      ))}
    </span>
  )
}

/**
 * Public list of a course's reviews with an average + count summary header.
 * Rendered on the course detail page for everyone (reviews are public). Each
 * row shows the star rating, the reviewer's display name when available (never
 * their email), and the optional comment body. Server component.
 *
 * Mobile-first and RTL-safe: a single-column stack; rating rows wrap and long
 * names/bodies break rather than overflow.
 *
 * @param props.reviews - Reviews, newest first.
 * @param props.averageRating - Aggregate average (1 decimal), or null when none.
 * @param props.count - Total number of reviews.
 */
export async function ReviewList({
  reviews,
  averageRating,
  count,
}: {
  reviews: CourseReview[]
  averageRating: number | null
  count: number
}) {
  const t = await getTranslations("Course.reviews")

  return (
    <section aria-labelledby="reviews-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id="reviews-heading" className="text-lg font-semibold">
          {t("heading")}
        </h2>
        {count > 0 && averageRating !== null ? (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Stars rating={Math.round(averageRating)} />
            <span className="tabular-nums">{averageRating.toFixed(1)}</span>
            <span>{t("summaryCount", { count })}</span>
          </span>
        ) : null}
      </div>

      {count === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {reviews.map((review) => (
            <li
              key={review.id}
              className="flex min-w-0 flex-col gap-1 rounded-lg border bg-card p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Stars rating={review.rating} />
                <span className="min-w-0 break-words text-sm font-medium">
                  {review.reviewerName ?? t("anonymous")}
                </span>
              </div>
              {review.body ? (
                <p className="min-w-0 break-words text-sm text-muted-foreground">
                  {review.body}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
