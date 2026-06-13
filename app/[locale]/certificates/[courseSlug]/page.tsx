import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { requireUser } from "@/lib/auth/require-user"
import { issueCertificate } from "@/lib/certificates/actions"
import { getCertificateByCourse } from "@/lib/certificates/queries"
import { getCourseDetailBySlug } from "@/lib/courses/queries"
import { isEligibleForCertificate } from "@/lib/certificates/queries"
import { PrintButton } from "@/components/certificates/print-button"
import { Link } from "@/i18n/navigation"
import type { Locale } from "@/i18n/routing"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; courseSlug: string }>
}): Promise<Metadata> {
  const { locale, courseSlug } = await params
  const t = await getTranslations({ locale, namespace: "Certificates" })
  return {
    title: t("certificateFor", { course: courseSlug }),
    robots: { index: false, follow: false },
  }
}

/**
 * Printable certificate page.
 *
 * Decision: no PDF library. This page is styled with print CSS so the browser's
 * built-in Print-to-PDF produces the artifact. A PrintButton client island
 * calls window.print(). This avoids adding heavy PDF dependencies (puppeteer,
 * pdfkit, react-pdf) for what is essentially a styled A4 page.
 *
 * Flow:
 * 1. requireUser - must be authenticated.
 * 2. Load course by slug - 404 if not found.
 * 3. Check eligibility - if not eligible, show "not earned" state.
 * 4. Issue certificate idempotently (creates if not exists, returns existing).
 * 5. Render the printable card + Print/Download button.
 */
export default async function CertificatePage({
  params,
}: {
  params: Promise<{ locale: string; courseSlug: string }>
}) {
  const { locale, courseSlug } = await params
  setRequestLocale(locale as Locale)

  const userId = await requireUser()
  const [t, course] = await Promise.all([
    getTranslations("Certificates"),
    getCourseDetailBySlug(courseSlug),
  ])

  if (!course) {
    notFound()
  }

  // Check if the user has already earned a certificate (fast path).
  let cert = await getCertificateByCourse(userId, course.id)

  if (!cert) {
    // Not yet issued. Check eligibility before attempting to issue.
    const eligible = await isEligibleForCertificate(userId, course.id)
    if (!eligible) {
      // Not eligible - course not complete.
      return (
        <main
          id="main-content"
          className="mx-auto w-full max-w-3xl min-w-0 px-4 py-8"
        >
          <Link
            href="/certificates"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            {t("backToCertificates")}
          </Link>
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="font-medium text-foreground">{t("notEarned.title")}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("notEarned.body", { course: course.title })}
            </p>
            <Link
              href={`/courses/${courseSlug}`}
              className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t("continueLearning")}
            </Link>
          </div>
        </main>
      )
    }

    // Issue the certificate now.
    const result = await issueCertificate(course.id)
    if (!result.ok) {
      return (
        <main
          id="main-content"
          className="mx-auto w-full max-w-3xl min-w-0 px-4 py-8"
        >
          <p className="text-destructive">{t("issueError")}</p>
        </main>
      )
    }
    cert = result.data
  }

  // Extract metadata stored at issue time.
  const meta = (cert as { metadata?: Record<string, string> | null }).metadata
  const studentName = meta?.studentName ?? t("student")
  const issuedDate =
    meta?.issuedDate ?? cert.issuedAt.slice(0, 10)
  const academyName = meta?.academyName ?? "Eyal's Coding Academy"

  return (
    <>
      {/*
       * Print styles: hide nav, header, print-button in print view.
       * The .certificate-card is the only visible element when printing.
       */}
      <style>{`
        @media print {
          body > *:not(#print-root) { display: none !important; }
          header, nav, footer, .print\\:hidden { display: none !important; }
          .certificate-card { box-shadow: none !important; border: 2px solid #000 !important; }
          @page { margin: 1cm; size: A4 landscape; }
        }
      `}</style>

      <main
        id="main-content"
        className="mx-auto w-full max-w-3xl min-w-0 px-4 py-8"
      >
        <div className="mb-6 flex items-center justify-between print:hidden">
          <Link
            href="/certificates"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            {t("backToCertificates")}
          </Link>
          <PrintButton label={t("printDownload")} />
        </div>

        {/* Certificate card - this is what prints */}
        <div
          id="print-root"
          className="certificate-card rounded-2xl border-2 border-primary/30 bg-card p-8 text-center shadow-lg sm:p-12"
          role="document"
          aria-label={t("certificateAriaLabel", { course: course.title })}
        >
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t("academyLabel")}
            </p>
            <p className="mt-1 text-2xl font-bold text-foreground sm:text-3xl">
              {academyName}
            </p>
          </div>

          <div className="mb-8">
            <p className="text-sm text-muted-foreground">{t("thisIsToConfirm")}</p>
            <p className="mt-2 break-words text-3xl font-semibold text-primary sm:text-4xl">
              {studentName}
            </p>
          </div>

          <div className="mb-8">
            <p className="text-sm text-muted-foreground">
              {t("hasSuccessfullyCompleted")}
            </p>
            <p className="mt-2 break-words text-2xl font-semibold text-foreground sm:text-3xl">
              {course.title}
            </p>
          </div>

          <div className="mx-auto mb-6 w-16 border-t border-primary/40" />

          <div>
            <p className="text-sm text-muted-foreground">{t("issuedOnLabel")}</p>
            <p className="mt-1 text-base font-medium text-foreground">
              {issuedDate}
            </p>
          </div>

          <div className="mt-6">
            <p className="text-xs text-muted-foreground">
              {t("certificateId")}: {cert.id}
            </p>
          </div>
        </div>
      </main>
    </>
  )
}
