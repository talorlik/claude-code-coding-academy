"use client"

import { useTransition } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/i18n/navigation"

import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { enrollInCourse } from "@/lib/courses/actions"

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface EnrollmentButtonProps {
  courseId: string
  courseSlug: string
  /** Authenticated user id, or null for anonymous visitors. */
  userId: string | null
  /** Whether the current user is already enrolled. */
  isEnrolled: boolean
  /**
   * When set, the course has an active price and requires payment.
   * The button links to this checkout URL instead of directly enrolling.
   * Free courses leave this undefined.
   */
  checkoutHref?: string
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Client component managing enrollment CTA state:
 * - Anonymous user: renders a Link to /login with a signInToContinue notice.
 * - Enrolled user: renders a "Continue Learning" link to /courses/[slug].
 * - Authenticated but not enrolled: renders an enroll button that fires the
 *   server action, then routes to the course on success.
 *
 * Accessible: the button is a real <button> with aria-busy while pending.
 */
export function EnrollmentButton({
  courseId,
  courseSlug,
  userId,
  isEnrolled,
  checkoutHref,
}: EnrollmentButtonProps) {
  const t = useTranslations("Courses")
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const courseHref = `/courses/${courseSlug}` as const

  // Anonymous: prompt to sign in.
  if (!userId) {
    return (
      <Button
        render={
          <Link href={`/login?notice=signInToContinue`} className="w-full" />
        }
        variant="outline"
        className="w-full"
      >
        {t("enroll")}
      </Button>
    )
  }

  // Already enrolled: continue link.
  if (isEnrolled) {
    return (
      <Button
        render={<Link href={courseHref} className="w-full" />}
        variant="default"
        className="w-full"
      >
        {t("continue")}
      </Button>
    )
  }

  // Authenticated, not enrolled, paid course: route to checkout.
  if (checkoutHref) {
    return (
      <Button
        render={<Link href={checkoutHref} className="w-full" />}
        variant="default"
        className="w-full"
      >
        {t("enroll")}
      </Button>
    )
  }

  // Authenticated, not enrolled, free course: enroll action.
  function handleEnroll() {
    startTransition(async () => {
      const result = await enrollInCourse({ courseId })
      if (result.ok) {
        router.push(courseHref)
      }
      // On failure the button returns to idle; no alert needed here since
      // the server action logs the error. A toast layer (batch 12) will
      // surface server-side errors in the final UX.
    })
  }

  return (
    <Button
      onClick={handleEnroll}
      disabled={isPending}
      aria-busy={isPending}
      className="w-full"
    >
      {isPending ? t("loading") : t("enroll")}
    </Button>
  )
}
