import { getTranslations } from "next-intl/server"

import { submitReview } from "@/lib/courses/actions"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { CourseReview } from "@/lib/courses/types"

/**
 * The course review form (Batch 19). A Tier-2 no-JS form: a real `<form>`
 * posting to the {@link submitReview} server action, a native radio group for
 * the 1-5 rating, a `<label>`-ed comment textarea, and a `type="submit"` button,
 * so it works with scripting disabled. Feedback arrives out of band through the
 * `?notice=`/`?error=` channel resolved by the page; this component renders the
 * resolved banner above the fields.
 *
 * The page renders this ONLY for signed-in, enrolled students (the action and
 * the `course_reviews` RLS policy both re-enforce that gate). When the student
 * already has a review, `existing` pre-fills the controls so a resubmit edits
 * it (the action upserts on the unique `(course_id, user_id)`).
 *
 * Server component (the only interactivity is the native form submit).
 * Mobile-first and RTL-safe: a single-column stack, a wrapping radio row, and a
 * wrapping submit row.
 *
 * @param props.courseId - The course UUID (hidden field).
 * @param props.courseSlug - The course slug (hidden field; drives the redirect).
 * @param props.existing - The student's current review for edit mode, or null.
 * @param props.errorMessage - Localized error banner text, or null/absent.
 * @param props.noticeMessage - Localized success banner text, or null/absent.
 */
export async function ReviewForm({
  courseId,
  courseSlug,
  existing,
  errorMessage,
  noticeMessage,
}: {
  courseId: string
  courseSlug: string
  existing: CourseReview | null
  errorMessage?: string | null
  noticeMessage?: string | null
}) {
  const t = await getTranslations("Course.reviews")
  const currentRating = existing?.rating ?? 0

  return (
    <form
      action={submitReview}
      className="flex w-full min-w-0 flex-col gap-4 rounded-lg border bg-card p-4"
      noValidate
    >
      <h3 className="text-base font-semibold">
        {existing ? t("editTitle") : t("formTitle")}
      </h3>

      <input type="hidden" name="courseId" value={courseId} />
      <input type="hidden" name="slug" value={courseSlug} />

      {errorMessage ? (
        <p
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}
      {noticeMessage ? (
        <p
          className="rounded-md bg-success px-3 py-2 text-sm text-success-foreground"
          role="status"
        >
          {noticeMessage}
        </p>
      ) : null}

      {/* Rating: a native radio group, so it submits with no JS. The labels
          read "N stars" for assistive tech; the fieldset legend names it. */}
      <fieldset className="flex min-w-0 flex-col gap-2">
        <legend className="text-sm font-medium">{t("ratingLabel")}</legend>
        <div className="flex flex-wrap gap-3">
          {[1, 2, 3, 4, 5].map((value) => (
            <label
              key={value}
              className="flex items-center gap-1.5 text-sm"
            >
              <input
                type="radio"
                name="rating"
                value={value}
                defaultChecked={value === currentRating}
                required
                className="size-4"
              />
              {t("stars", { count: value })}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-2">
        <Label htmlFor="review-body">{t("bodyLabel")}</Label>
        <Textarea
          id="review-body"
          name="body"
          rows={4}
          maxLength={1000}
          defaultValue={existing?.body ?? ""}
          placeholder={t("bodyPlaceholder")}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" className="min-w-0">
          {existing ? t("update") : t("submit")}
        </Button>
      </div>
    </form>
  )
}
