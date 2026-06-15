import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { UnsplashImage } from "@/components/unsplash-image"
import type { Locale } from "@/i18n/routing"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "About" })

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      locale,
    },
  }
}

/**
 * Public About page (Batch 16).
 *
 * This is a structured shell only: the real marketing copy and hero image are
 * supplied later. Two clearly-marked single edit points are left for that
 * handoff - the hero image region (the commented `HERO IMAGE SLOT` block below)
 * and the provisional body copy (the `About.*` i18n keys flagged provisional in
 * both catalogs). Replacing those slots should not require touching layout.
 *
 * Server component: `setRequestLocale` then `getTranslations("About")`, exactly
 * one `<main id="main-content">` and one `<h1>`, semantic `<section>` landmarks.
 * Mobile-first and RTL-safe via Tailwind logical utilities.
 */
export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale as Locale)

  const t = await getTranslations("About")

  return (
    <main id="main-content" className="flex flex-1 flex-col">
      {/* Hero ------------------------------------------------------------- */}
      <section className="bg-gradient-to-b from-background to-muted/30 px-4 py-12 sm:py-20">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 md:flex-row md:items-center md:gap-12">
          <div className="flex min-w-0 flex-1 flex-col gap-4 text-center md:text-start">
            <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {t("heroTitle")}
            </h1>
            {/* PROVISIONAL COPY: replace About.heroSubtitle in both catalogs. */}
            <p className="text-pretty text-base text-muted-foreground sm:text-lg">
              {t("heroSubtitle")}
            </p>
          </div>

          {/*
            HERO IMAGE - Batch 23 filled the former placeholder slot with a
            curated, self-hosted Unsplash coding photo (code-monitor). Framed and
            attributed by <UnsplashImage />, which carries its own credit line.
          */}
          <UnsplashImage
            name="code-monitor"
            className="w-full min-w-0 flex-1"
            rounded="rounded-[var(--radius-large-blocks)]"
            sizes="(max-width: 768px) 100vw, 40vw"
            priority
          />
        </div>
      </section>

      {/* Mission ---------------------------------------------------------- */}
      <section
        aria-labelledby="about-mission-heading"
        className="px-4 py-12 sm:py-16"
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          <h2
            id="about-mission-heading"
            className="text-2xl font-semibold tracking-tight"
          >
            {t("missionTitle")}
          </h2>
          {/* PROVISIONAL COPY: replace About.missionBody in both catalogs. */}
          <p className="text-pretty text-muted-foreground">
            {t("missionBody")}
          </p>
        </div>
      </section>

      {/* CTA -------------------------------------------------------------- */}
      <section className="px-4 pb-16">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 rounded-xl border bg-card px-6 py-10 text-center">
          <h2 className="text-xl font-semibold tracking-tight text-balance">
            {t("ctaTitle")}
          </h2>
          <p className="text-pretty text-sm text-muted-foreground">
            {t("ctaSubtitle")}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button
              render={<Link href="/courses" />}
              nativeButton={false}
              size="lg"
              className="min-w-0"
            >
              {t("ctaButton")}
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
