import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Award } from "lucide-react"

import { requireUser } from "@/lib/auth/require-user"
import { getMyCertificates } from "@/lib/certificates/queries"
import { Link } from "@/i18n/navigation"
import type { Locale } from "@/i18n/routing"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Certificates" })
  return {
    title: t("pageTitle"),
    robots: { index: false, follow: false },
  }
}

/**
 * Student certificate list page. Requires authentication.
 *
 * Shows all certificates earned by the authenticated user. Each certificate
 * links to the printable certificate page for that course.
 */
export default async function CertificatesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale as Locale)

  const userId = await requireUser()
  const [t, certificates] = await Promise.all([
    getTranslations("Certificates"),
    getMyCertificates(userId),
  ])

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-3xl min-w-0 px-4 py-8"
    >
      <section aria-labelledby="certs-heading">
        <h1
          id="certs-heading"
          className="mb-6 text-2xl font-semibold text-foreground"
        >
          {t("pageTitle")}
        </h1>

        {certificates.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Award
              className="mx-auto mb-3 size-10 text-muted-foreground"
              aria-hidden="true"
            />
            <p className="font-medium text-foreground">{t("empty.title")}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("empty.body")}
            </p>
            <Link
              href="/courses"
              className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t("browseCourses")}
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {certificates.map((cert) => {
              const meta = cert as typeof cert & {
                metadata?: {
                  courseTitle?: string
                  courseSlug?: string
                  issuedDate?: string
                  academyName?: string
                } | null
              }
              const courseSlug =
                (meta as { metadata?: { courseSlug?: string } }).metadata
                  ?.courseSlug ?? cert.courseId
              const courseTitle =
                (meta as { metadata?: { courseTitle?: string } }).metadata
                  ?.courseTitle ?? t("unknownCourse")
              const issuedDate = cert.issuedAt.slice(0, 10)

              return (
                <li key={cert.id}>
                  <Link
                    href={`/certificates/${courseSlug}`}
                    className="flex min-w-0 items-center gap-4 rounded-lg border bg-card p-4 hover:bg-accent/40 transition-colors"
                  >
                    <Award
                      className="size-8 shrink-0 text-primary"
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="break-words font-medium text-foreground">
                        {courseTitle}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t("issuedOn", { date: issuedDate })}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm text-primary">
                      {t("view")}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </main>
  )
}
