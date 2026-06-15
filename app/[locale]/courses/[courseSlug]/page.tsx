import { notFound } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"
import type { Metadata } from "next"
import { ArrowLeft } from "lucide-react"

import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { UnsplashImage } from "@/components/unsplash-image"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import { LessonSidebar } from "@/components/courses/lesson-sidebar"
import { LessonSidebarMobile } from "@/components/courses/lesson-sidebar-mobile"
import { CourseProgressBar } from "@/components/courses/course-progress-bar"
import { YouTubePlayer } from "@/components/youtube/youtube-player"
import { MarkWatchedButton } from "@/components/courses/mark-watched-button"
import { EnrollmentButton } from "@/components/courses/enrollment-button"
import { LessonSearch } from "@/components/courses/lesson-search"
import { ReviewList } from "@/components/courses/review-list"
import { ReviewForm } from "@/components/courses/review-form"
import {
  getCourseDetailBySlug,
  getCourseReviews,
  getUserReview,
} from "@/lib/courses/queries"
import { resolveReviewMessage } from "@/lib/courses/resolve-review-message"
import { getEnrollment, getCourseProgress } from "@/lib/progress/queries"
import { getConversationMessages } from "@/lib/tutor/queries"
import { getActiveCoursePrice } from "@/lib/payments/checkout"
import { createClient } from "@/lib/supabase/server"
import { getSiteUrl } from "@/lib/utils/site-url"
import type { Locale } from "@/i18n/routing"
import {
  TutorChat,
  TutorSignInCta,
  TutorEnrollCta,
} from "@/components/tutor/tutor-chat"

// ---------------------------------------------------------------------------
// Route decision (documented here per batch 06 spec)
// ---------------------------------------------------------------------------
//
// Route: /[locale]/courses/[courseSlug]?lesson=<lessonSlug>
//
// Why search-param (not nested segment): The batch-05 catalog links to
// /courses/<slug> which is this page. Using ?lesson= for lesson selection avoids
// an additional segment (/courses/[courseSlug]/[lessonSlug]) that would require
// a redirect from /courses/[courseSlug] to the first lesson. The search-param
// approach keeps the page at one canonical URL while letting the lesson change
// without a full navigation.
//
// Auth/gating: The page is public (SEO + preview). The YouTube player renders
// only for (a) preview lessons, or (b) authed + enrolled users. Non-preview
// lessons for unenrolled/anon visitors show a gated CTA. requireUser is NOT
// called at page top.

// ---------------------------------------------------------------------------
// generateStaticParams - not used (dynamic course data, no static export)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// generateMetadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; courseSlug: string }>
}): Promise<Metadata> {
  const { locale, courseSlug } = await params

  try {
    const course = await getCourseDetailBySlug(courseSlug)
    if (!course) {
      return {}
    }

    const t = await getTranslations({ locale, namespace: "Course" })
    const baseUrl = getSiteUrl()

    return {
      title: course.title,
      description: course.description ?? t("metaDescriptionFallback"),
      openGraph: baseUrl
        ? {
            title: course.title,
            description: course.description ?? undefined,
            url: `${baseUrl}/${locale}/courses/${courseSlug}`,
          }
        : undefined,
    }
  } catch {
    return {}
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the completion panel when all lessons are done. */
function CourseCompletionState({
  courseTitle,
  courseSlug,
  t,
}: {
  courseTitle: string
  courseSlug: string
  t: (key: string) => string
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-8 text-center">
      <span className="text-4xl" aria-hidden="true">
        🎉
      </span>
      <h2 className="text-xl font-semibold">{t("completionTitle")}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        {t("completionBody")}
      </p>
      <p className="text-xs text-muted-foreground">{courseTitle}</p>
      {/* Certificate CTA - issues and links to the printable certificate page */}
      <Button
        render={<Link href={`/certificates/${courseSlug}`} />}
        variant="default"
        size="sm"
      >
        {t("getCertificate")}
      </Button>
    </div>
  )
}

/** Returns the gated state for non-preview lessons when not enrolled. */
function GatedLesson({
  userId,
  courseId,
  courseSlug,
  checkoutHref,
  t,
}: {
  userId: string | null
  courseId: string
  courseSlug: string
  checkoutHref?: string
  t: (key: string) => string
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg bg-muted/40 p-8 text-center">
      <span className="text-3xl" aria-hidden="true">
        🔒
      </span>
      <p className="font-medium">{t("lockedTitle")}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{t("lockedBody")}</p>
      <EnrollmentButton
        courseId={courseId}
        courseSlug={courseSlug}
        userId={userId}
        isEnrolled={false}
        checkoutHref={checkoutHref}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function CourseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; courseSlug: string }>
  searchParams: Promise<{ lesson?: string; notice?: string; error?: string }>
}) {
  const { locale, courseSlug } = await params
  const {
    lesson: lessonSlugParam,
    notice: reviewNotice,
    error: reviewError,
  } = await searchParams

  setRequestLocale(locale as Locale)

  const t = await getTranslations({ locale, namespace: "Course" })
  const tReviewMessages = await getTranslations("Course.reviews.messages")

  // 1. Load course (published only) - 404 if not found.
  let course
  try {
    course = await getCourseDetailBySlug(courseSlug)
  } catch {
    course = null
  }

  if (!course) {
    notFound()
  }

  // 2. Resolve current user.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const userId = user?.id ?? null

  // 3. Load enrollment + progress for authed users + active price.
  let isEnrolled = false
  let completedLessonIds = new Set<string>()
  let progress: import("@/lib/progress/types").CourseProgress = {
    totalLessons: course.lessons.length,
    completedLessons: 0,
    percent: 0,
    lastWatchedAt: null,
    isComplete: false,
    nextLessonId: course.lessons[0]?.id ?? null,
  }

  // Fetch the active price in parallel with enrollment.
  const [activePrice] = await Promise.all([getActiveCoursePrice(course.id)])

  if (userId) {
    const [enrollment, progressData] = await Promise.all([
      getEnrollment(userId, course.id),
      getCourseProgress(
        userId,
        course.id,
        course.lessons.map((l) => ({ id: l.id, sortOrder: l.sortOrder }))
      ),
    ])

    isEnrolled = enrollment !== null
    completedLessonIds = progressData.completedLessonIds
    progress = progressData.progress
  }

  // Reviews: the public list (everyone) and, for an enrolled viewer, their own
  // review for edit-mode prefill. Resolve any review-action feedback code.
  const reviewsData = await getCourseReviews(course.id)
  const existingReview =
    userId && isEnrolled ? await getUserReview(userId, course.id) : null
  const reviewErrorMessage = resolveReviewMessage(tReviewMessages, reviewError)
  const reviewNoticeMessage = resolveReviewMessage(tReviewMessages, reviewNotice)

  // Route to checkout for paid courses that are not yet enrolled.
  const checkoutHref =
    activePrice && !isEnrolled
      ? (`/courses/${courseSlug}/checkout` as const)
      : undefined

  // 4. Determine selected lesson.
  //    Priority: explicit ?lesson= param > last_accessed for enrolled >
  //    next incomplete for enrolled > first lesson.
  const lessons = course.lessons

  let selectedLesson = lessons[0] ?? null

  if (lessonSlugParam) {
    const found = lessons.find((l) => l.slug === lessonSlugParam)
    if (found) selectedLesson = found
  } else if (isEnrolled && progress.nextLessonId) {
    const next = lessons.find((l) => l.id === progress.nextLessonId)
    if (next) selectedLesson = next
  }

  // 5. Determine next lesson slug for MarkWatchedButton.
  const selectedIdx = selectedLesson
    ? lessons.findIndex((l) => l.id === selectedLesson!.id)
    : -1

  const nextLessonSlug =
    selectedIdx >= 0 && selectedIdx < lessons.length - 1
      ? (lessons[selectedIdx + 1]?.slug ?? null)
      : null

  // Actually computed next from progress (first incomplete after current):
  // Use progress.nextLessonId for the mark-watched action's routing.
  const nextLessonSlugForAction =
    progress.nextLessonId && progress.nextLessonId !== selectedLesson?.id
      ? (lessons.find((l) => l.id === progress.nextLessonId)?.slug ?? nextLessonSlug)
      : nextLessonSlug

  // 6. Determine if the selected lesson can be played.
  const canWatch =
    selectedLesson !== null &&
    (selectedLesson.isPreview || (userId !== null && isEnrolled))

  const isWatched =
    selectedLesson !== null && completedLessonIds.has(selectedLesson.id)

  // 7. Prefetch the latest tutor conversation + messages for the selected lesson.
  //    Only when the user is authenticated AND (enrolled OR lesson is preview).
  //    The initial data is passed as props so the chat panel shows history on
  //    mount without a client-side round-trip.
  let tutorConversationId: string | undefined
  let tutorInitialMessages: import("ai").UIMessage[] = []

  if (userId && selectedLesson) {
    const tutorAllowed =
      selectedLesson.isPreview || (userId !== null && isEnrolled)
    if (tutorAllowed) {
      try {
        // Look up the most recent conversation for this user + course + lesson.
        const { data: convRows } = await supabase
          .from("ai_tutor_conversations")
          .select("id")
          .eq("user_id", userId)
          .eq("course_id", course.id)
          .eq("lesson_id", selectedLesson.id)
          .order("updated_at", { ascending: false })
          .limit(1)

        const latestConvId = convRows?.[0]?.id
        if (latestConvId) {
          tutorConversationId = latestConvId
          const msgs = await getConversationMessages(latestConvId, 20)
          tutorInitialMessages = msgs.map((m, idx) => ({
            id: m.id ?? String(idx),
            role: m.role as "user" | "assistant",
            parts: [{ type: "text" as const, text: m.content }],
            content: m.content,
          }))
        }
      } catch {
        // Non-fatal: the panel will simply start empty.
      }
    }
  }

  // 8. Zero-lesson state.
  if (lessons.length === 0) {
    return (
      <main id="main-content" className="mx-auto max-w-4xl px-4 py-8">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("backToCatalog")}
        </Link>
        <h1 className="mb-2 text-2xl font-bold">{course.title}</h1>
        <Empty className="mt-8 border border-dashed">
          <EmptyHeader>
            <EmptyTitle>{t("noLessons")}</EmptyTitle>
            <EmptyDescription>{t("noLessonsBody")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </main>
    )
  }

  return (
    <main id="main-content" className="flex min-h-0 flex-1 flex-col">
      {/* ---------------------------------------------------------------- */}
      {/* Course header                                                      */}
      {/* ---------------------------------------------------------------- */}
      <div className="border-b bg-background px-4 py-4">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/"
            className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {t("backToCatalog")}
          </Link>

          {/* Framed Unsplash header photo (Batch 23) - shown ONLY when the
              course has no real cover image. A theme scrim keeps any overlaid
              text legible in both themes; the title text stays below for SEO
              and single-<h1> semantics. */}
          {!course.coverImageUrl && (
            <UnsplashImage
              name="monitor-code"
              className="mb-3"
              rounded="rounded-[var(--radius-large-blocks)]"
              aspect="aspect-[16/5]"
              sizes="(max-width: 1280px) 100vw, 1280px"
              scrim
              priority
            />
          )}

          <div className="flex min-w-0 flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="break-words text-xl font-bold leading-tight sm:text-2xl">
                {course.title}
              </h1>
              {course.description && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {course.description}
                </p>
              )}
            </div>

            {/* Progress bar - only when enrolled */}
            {isEnrolled && (
              <div className="w-full sm:w-48 shrink-0">
                <CourseProgressBar progress={progress} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Body: sidebar + lesson area                                        */}
      {/* ---------------------------------------------------------------- */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col md:flex-row">
        {/* Desktop sidebar (md+) */}
        <aside className="hidden w-72 shrink-0 overflow-y-auto border-e md:block">
          <LessonSidebar
            lessons={lessons}
            activeSlug={selectedLesson?.slug ?? ""}
            courseSlug={courseSlug}
            completedLessonIds={completedLessonIds}
          />
        </aside>

        {/* Main lesson area */}
        <div className="min-w-0 flex-1 px-4 py-6">
          {/* Mobile sidebar toggle */}
          <div className="mb-4 md:hidden">
            <LessonSidebarMobile
              lessons={lessons}
              activeSlug={selectedLesson?.slug ?? ""}
              courseSlug={courseSlug}
              completedLessonIds={completedLessonIds}
              courseTitle={course.title}
            />
          </div>

          {/* Course complete state */}
          {progress.isComplete && !selectedLesson && (
            <CourseCompletionState
              courseTitle={course.title}
              courseSlug={courseSlug}
              t={(k) => t(k as Parameters<typeof t>[0])}
            />
          )}

          {/* Lesson detail */}
          {selectedLesson && (
            <>
              {/* Video area */}
              {canWatch ? (
                <YouTubePlayer
                  videoId={selectedLesson.youtubeVideoId}
                  title={selectedLesson.title}
                  className="mb-4"
                />
              ) : (
                <GatedLesson
                  userId={userId}
                  courseId={course.id}
                  courseSlug={courseSlug}
                  checkoutHref={checkoutHref}
                  t={(k) => t(k as Parameters<typeof t>[0])}
                />
              )}

              <Separator className="my-4" />

              {/* Lesson info */}
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h2 className="break-words text-lg font-semibold leading-tight">
                      {selectedLesson.title}
                    </h2>
                    {selectedLesson.isPreview && (
                      <Badge variant="secondary" className="shrink-0">
                        {t("previewBadge")}
                      </Badge>
                    )}
                  </div>
                  {selectedLesson.description && (
                    <p className="text-sm text-muted-foreground">
                      {selectedLesson.description}
                    </p>
                  )}
                </div>

                {/* Mark watched / watched indicator */}
                {userId && isEnrolled && canWatch && (
                  <div className="shrink-0">
                    <MarkWatchedButton
                      courseId={course.id}
                      lessonId={selectedLesson.id}
                      courseSlug={courseSlug}
                      nextLessonSlug={nextLessonSlugForAction}
                      isWatched={isWatched}
                    />
                  </div>
                )}
              </div>

              {/* Course completion panel (shown when complete and a lesson is selected) */}
              {progress.isComplete && (
                <div className="mt-6">
                  <CourseCompletionState
                    courseTitle={course.title}
                    courseSlug={courseSlug}
                    t={(k) => t(k as Parameters<typeof t>[0])}
                  />
                </div>
              )}

              {/* AI Tutor panel */}
              <div className="mt-6">
                {userId === null ? (
                  <TutorSignInCta />
                ) : canWatch ? (
                  <TutorChat
                    courseId={course.id}
                    lessonId={selectedLesson.id}
                    initialConversationId={tutorConversationId}
                    initialMessages={tutorInitialMessages}
                    locale={locale}
                  />
                ) : (
                  <TutorEnrollCta />
                )}
              </div>
            </>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* In-course lesson search + reviews (course-level, below the        */}
          {/* selected lesson). Lesson search is scoped to this course.         */}
          {/* ---------------------------------------------------------------- */}
          <Separator className="my-8" />

          <div className="flex flex-col gap-8">
            <LessonSearch lessons={lessons} courseSlug={courseSlug} />

            <ReviewList
              reviews={reviewsData.reviews}
              averageRating={reviewsData.averageRating}
              count={reviewsData.count}
            />

            {/* Write path: only for signed-in, enrolled students. */}
            {userId && isEnrolled ? (
              <ReviewForm
                courseId={course.id}
                courseSlug={courseSlug}
                existing={existingReview}
                errorMessage={reviewErrorMessage}
                noticeMessage={reviewNoticeMessage}
              />
            ) : null}
          </div>
        </div>
      </div>
    </main>
  )
}
