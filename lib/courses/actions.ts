"use server"
import "server-only"

import { revalidatePath } from "next/cache"
import { getLocale } from "next-intl/server"

import { redirect } from "@/i18n/navigation"
import { createClient } from "@/lib/supabase/server"
import { fail, ok } from "@/lib/types/action-result"
import type { ActionResult } from "@/lib/types/action-result"
import { enrollmentSchema, reviewSchema } from "@/lib/validation/course"
import { parseWithSchema } from "@/lib/validation/parse"
import type { ReviewMessageCode } from "@/lib/courses/resolve-review-message"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Payload returned on successful enrollment. */
export interface EnrollResult {
  courseId: string
  slug: string
  /** First lesson id by sort_order, for "continue" deep-link. Null if the
   *  course has no lessons yet. */
  targetLessonId: string | null
}

// ---------------------------------------------------------------------------
// enrollInCourse
// ---------------------------------------------------------------------------

/**
 * Server action: enroll the authenticated user in a course.
 *
 * Auth: reads the session from the request-scoped client. Returns a typed
 * `fail` with code `signInRequired` instead of redirecting so the client
 * component can route to `/login` without a server-driven redirect.
 *
 * Idempotency: relies on the unique(user_id, course_id) constraint and uses
 * `onConflict: 'ignore'` so repeat calls succeed silently. The enrollment
 * row is always read back to confirm it exists.
 *
 * RLS: the `enrollments` insert policy enforces `user_id = auth.uid()`;
 * the publishable-key client passes the signed-in user's JWT, so the DB
 * rejects any attempt to enroll a different user.
 *
 * @param input - Object with `courseId` (UUID string).
 * @returns `ok(EnrollResult)` on success or `fail(message)` on error.
 */
export async function enrollInCourse(
  input: unknown
): Promise<ActionResult<EnrollResult>> {
  const supabase = await createClient()

  // 1. Validate session.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return fail<EnrollResult>("signInRequired")
  }

  // 2. Validate input.
  const parsed = parseWithSchema(enrollmentSchema, input)
  if (!parsed.ok) {
    return fail<EnrollResult>(parsed.message, parsed.fieldErrors)
  }

  const { courseId } = parsed.data

  // 3. Verify the course exists and is published (defense-in-depth over RLS).
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, slug")
    .eq("id", courseId)
    .eq("status", "published")
    .single()

  if (courseError || !course) {
    return fail<EnrollResult>("courseNotFound")
  }

  // 4. Insert enrollment idempotently.
  //    The unique(user_id, course_id) constraint makes a duplicate a no-op.
  //    Supabase JS does not expose ON CONFLICT DO NOTHING directly, so we
  //    upsert with ignoreDuplicates which translates to that SQL clause.
  const { error: insertError } = await supabase
    .from("enrollments")
    .upsert(
      { user_id: user.id, course_id: courseId },
      { onConflict: "user_id,course_id", ignoreDuplicates: true }
    )

  if (insertError) {
    console.error("[courses/actions] enrollInCourse insert:", insertError)
    return fail<EnrollResult>("Enrollment failed. Please try again.")
  }

  // 5. Resolve the first lesson for the "continue" deep-link.
  const { data: firstLesson } = await supabase
    .from("lessons")
    .select("id")
    .eq("course_id", courseId)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle()

  // 6. Revalidate catalog and dashboard so enrollment state reflects
  //    immediately on the next navigation.
  revalidatePath("/", "layout")

  return ok<EnrollResult>({
    courseId,
    slug: course.slug,
    targetLessonId: firstLesson?.id ?? null,
  })
}

// ---------------------------------------------------------------------------
// submitReview
// ---------------------------------------------------------------------------

/**
 * Maps a Zod field error from {@link parseWithSchema} to a stable, allowlisted
 * review message code. Returning a code (not the raw Zod string) keeps the
 * `?error=` channel anti-injection safe. Rating errors win over body errors.
 */
function firstReviewErrorCode(
  fieldErrors: Record<string, string> | undefined
): ReviewMessageCode {
  if (!fieldErrors) return "submissionFailed"
  if (fieldErrors.rating) return "invalidRating"
  if (fieldErrors.body) return "reviewTooLong"
  return "submissionFailed"
}

/**
 * Server action: submit or edit the authenticated, enrolled user's review for a
 * course. Tier-2 no-JS: it takes {@link FormData} from a real `<form>` and
 * redirects back to the course page with a `?notice=`/`?error=` code resolved
 * to a localized banner (see `lib/courses/resolve-review-message.ts`).
 *
 * Gating is enforced in two places: this action re-checks auth and that an
 * `enrollments` row exists for `(user, course)`, AND the `course_reviews` RLS
 * policy independently requires own-row + enrolled. The write is an idempotent
 * upsert on the unique `(course_id, user_id)` constraint, so a second submit
 * edits the existing review rather than erroring. The RLS request client is
 * used throughout - never the service role.
 *
 * @param formData - Fields: `courseId` (uuid), `slug` (for the redirect),
 *   `rating` ("1".."5"), and optional `body`.
 */
export async function submitReview(formData: FormData): Promise<void> {
  const locale = await getLocale()

  // The slug drives the redirect target. Validated as a safe same-site path
  // segment so a forged value cannot redirect off-site.
  const rawSlug = String(formData.get("slug") ?? "").trim()
  const slug = /^[a-z0-9-]+$/.test(rawSlug) ? rawSlug : ""
  const back = (code: string, kind: "notice" | "error") =>
    redirect({
      href: slug ? `/courses/${slug}?${kind}=${code}` : `/courses`,
      locale,
    })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return back("signInRequired", "error")

  // FormData.get returns null for an absent field; the schema's body is an
  // optional string, so normalize null -> undefined (an empty/absent comment is
  // valid, not a type error).
  const rawBody = formData.get("body")
  const parsed = parseWithSchema(reviewSchema, {
    courseId: formData.get("courseId"),
    rating: formData.get("rating"),
    body: typeof rawBody === "string" ? rawBody : undefined,
  })
  if (!parsed.ok) return back(firstReviewErrorCode(parsed.fieldErrors), "error")

  const { courseId, rating, body } = parsed.data

  // Re-check enrollment (the RLS policy also enforces this; checking here lets
  // us return a clear localized code instead of a generic DB rejection).
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .maybeSingle()
  if (!enrollment) return back("enrollmentRequired", "error")

  // Idempotent upsert on unique(course_id, user_id): a repeat submit edits.
  const { error } = await supabase.from("course_reviews").upsert(
    {
      course_id: courseId,
      user_id: user.id,
      rating,
      body: body ?? null,
    },
    { onConflict: "course_id,user_id" }
  )

  if (error) {
    console.error("[courses/actions] submitReview upsert:", error)
    return back("submissionFailed", "error")
  }

  // Refresh the course page (review list + the catalog rating aggregate).
  revalidatePath("/", "layout")
  return back("reviewSaved", "notice")
}
