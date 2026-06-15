import { redirect } from "next/navigation"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { ShieldCheck } from "lucide-react"

import { requireUser } from "@/lib/auth/require-user"
import { getCourseDetailBySlug } from "@/lib/courses/queries"
import {
  createCheckoutSession,
  confirmSimulatedPayment,
  hasPaidAccess,
  getActiveCoursePrice,
} from "@/lib/payments/checkout"
import { Link } from "@/i18n/navigation"
import type { Locale } from "@/i18n/routing"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; courseSlug: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Payments" })
  return {
    title: t("checkoutTitle"),
    robots: { index: false, follow: false },
  }
}

/**
 * Simulated checkout page for paid courses.
 *
 * SIMULATION-ONLY: no real card processing occurs. This page:
 * 1. Requires authentication.
 * 2. Verifies the course exists and has an active price.
 * 3. Redirects to the course page if the user already has access.
 * 4. Creates a checkout session (pending payments row) on load.
 * 5. Renders a clearly-labelled "Simulated payment" UI with no card input fields.
 * 6. On "Pay (Simulated)" form submit, calls confirmSimulatedPayment which
 *    sets status='paid' and enrolls the user, then redirects to the course.
 *
 * Design decision: no card input fields at all. The prompt specifies that
 * a clear "simulation" label + a simple "Pay (simulated)" confirm button is
 * preferred over fake card number inputs, which could mislead users.
 */
export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: string; courseSlug: string }>
}) {
  const { locale, courseSlug } = await params
  setRequestLocale(locale as Locale)

  const userId = await requireUser()
  const [t, course] = await Promise.all([
    getTranslations("Payments"),
    getCourseDetailBySlug(courseSlug),
  ])

  if (!course) {
    notFound()
  }

  // Check if user already has access.
  const alreadyHasAccess = await hasPaidAccess(userId, course.id)
  if (alreadyHasAccess) {
    // Already paid or free course - redirect to course page.
    redirect(`/${locale}/courses/${courseSlug}`)
  }

  // Verify there's an active price (should always exist if coming from CTA).
  const activePrice = await getActiveCoursePrice(course.id)
  if (!activePrice) {
    // Free course - redirect directly (shouldn't reach here via normal flow).
    redirect(`/${locale}/courses/${courseSlug}`)
  }

  // Create the checkout session (pending payment row).
  const sessionResult = await createCheckoutSession(course.id)

  if (!sessionResult.ok) {
    return (
      <main
        id="main-content"
        className="mx-auto w-full max-w-md min-w-0 px-4 py-8"
      >
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center">
          <p className="font-medium text-destructive">{t("errorTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("errorBody")}</p>
          <Link
            href={`/courses/${courseSlug}`}
            className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {t("retry")}
          </Link>
        </div>
      </main>
    )
  }

  const session = sessionResult.data

  // Format the price for display.
  const amountDisplay = (session.amountCents / 100).toFixed(2)
  const currencyDisplay = session.currency.toUpperCase()
  const priceLabel =
    session.displayLabel ??
    `${amountDisplay} ${currencyDisplay}`

  // Server action to confirm the simulated payment.
  async function handleConfirmPayment() {
    "use server"
    const result = await confirmSimulatedPayment(
      session.courseId,
      session.simulationEventId
    )
    const { redirect: navRedirect } = await import("@/i18n/navigation")
    const locale2 = await import("next-intl/server").then((m) => m.getLocale())

    if (result.ok) {
      return navRedirect({
        href: `/courses/${courseSlug}`,
        locale: locale2,
      })
    }
    return navRedirect({
      href: `/courses/${courseSlug}/checkout?error=${encodeURIComponent(result.message)}`,
      locale: locale2,
    })
  }

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-md min-w-0 px-4 py-8"
    >
      <div className="mb-6">
        <Link
          href={`/courses/${courseSlug}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {course.title}
        </Link>
      </div>

      <h1 className="mb-6 text-2xl font-semibold text-foreground">
        {t("checkoutTitle")}
      </h1>

      {/* Simulation banner - MUST be clearly visible. Uses the DESIGN.md accent
          (the theme's emphasis color, present in both palettes) rather than an
          amber the light palette does not define, so it stays prominent and
          palette-conformant in light and dark. */}
      <div
        role="alert"
        className="mb-6 flex items-start gap-3 rounded-lg border-2 border-brand-accent bg-brand-accent/10 px-4 py-3"
      >
        <ShieldCheck
          className="mt-0.5 size-5 shrink-0 text-brand-accent"
          aria-hidden="true"
        />
        <div>
          <p className="font-semibold text-brand-accent">
            {t("simulationBanner")}
          </p>
          <p className="mt-0.5 text-sm text-foreground">{t("simulationNote")}</p>
        </div>
      </div>

      {/* Order summary */}
      <div className="mb-6 rounded-lg border bg-card p-4">
        <div className="flex min-w-0 items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("courseLabel")}
            </p>
            <p className="mt-0.5 break-words font-medium text-foreground">
              {course.title}
            </p>
          </div>
          <div className="shrink-0 text-end">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("priceLabel")}
            </p>
            <p className="mt-0.5 font-semibold text-foreground">{priceLabel}</p>
          </div>
        </div>
      </div>

      {/* Confirm payment form - no card input fields */}
      <form action={handleConfirmPayment}>
        <button
          type="submit"
          className="w-full rounded-lg bg-primary py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {t("payButton")}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        {t("simulationNote")}
      </p>
    </main>
  )
}
