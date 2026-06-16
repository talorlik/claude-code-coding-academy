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
 * Public About page (Batch 27).
 *
 * Renders the supplied marketing copy (sourced from docs/content/ABOUT_EN.md and
 * ABOUT_HE.md) as six discrete sections, each backed by its own heading and
 * body-paragraph i18n keys in the `About` namespace rather than one prose blob,
 * so RTL mirroring and typography stay independently controllable. Section 4
 * (`skills`) carries a five-step ordered list rendered from `skills.step1..5`.
 *
 * The provisional Batch 16 hero/mission/CTA shell is replaced here, but the
 * hero-image slot and overall layout are preserved - this is a content swap, not
 * a redesign. Section 1 (`intro`) supplies the hero heading + lead paragraphs
 * alongside the existing {@link UnsplashImage} hero photo.
 *
 * Server component: `setRequestLocale` then `getTranslations("About")`, exactly
 * one `<main id="main-content">` and one `<h1>`, semantic `<section>` landmarks.
 * Mobile-first and RTL-safe via Tailwind logical utilities; only DESIGN.md
 * semantic tokens are used for framing.
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
      {/* Hero / Section 1 (intro) ----------------------------------------- */}
      <section
        aria-labelledby="about-intro-heading"
        className="bg-gradient-to-b from-background to-muted/30 px-4 py-12 sm:py-20"
      >
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-8 md:flex-row md:items-center md:gap-12">
          <div className="flex min-w-0 flex-1 flex-col gap-4 text-center md:text-start">
            <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {t("heroTitle")}
            </h1>
            <h2
              id="about-intro-heading"
              className="text-xl font-semibold tracking-tight text-balance text-muted-foreground sm:text-2xl"
            >
              {t("intro.heading")}
            </h2>
            <p className="text-pretty text-base text-muted-foreground sm:text-lg">
              {t("intro.body1")}
            </p>
            <p className="text-pretty text-muted-foreground">
              {t("intro.body2")}
            </p>
            <p className="text-pretty text-muted-foreground">
              {t("intro.body3")}
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

      {/* Sections 2-6 ----------------------------------------------------- */}
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-12 px-4 py-12 sm:gap-16 sm:py-16">
        {/* Section 2: A Smarter Way to Learn Programming */}
        <section
          aria-labelledby="about-smarter-heading"
          className="flex flex-col gap-4"
        >
          <h2
            id="about-smarter-heading"
            className="text-2xl font-semibold tracking-tight"
          >
            {t("smarter.heading")}
          </h2>
          <p className="text-pretty text-muted-foreground">
            {t("smarter.body1")}
          </p>
          <p className="text-pretty text-muted-foreground">
            {t("smarter.body2")}
          </p>
          <p className="text-pretty text-muted-foreground">
            {t("smarter.body3")}
          </p>
          <p className="text-pretty text-muted-foreground">
            {t("smarter.body4")}
          </p>
        </section>

        {/* Section 3: Professional Teaching, Personal Guidance */}
        <section
          aria-labelledby="about-teaching-heading"
          className="flex flex-col gap-4"
        >
          <h2
            id="about-teaching-heading"
            className="text-2xl font-semibold tracking-tight"
          >
            {t("teaching.heading")}
          </h2>
          <p className="text-pretty text-muted-foreground">
            {t("teaching.body1")}
          </p>
          <p className="text-pretty text-muted-foreground">
            {t("teaching.body2")}
          </p>
          <p className="text-pretty text-muted-foreground">
            {t("teaching.body3")}
          </p>
          <p className="text-pretty text-muted-foreground">
            {t("teaching.body4")}
          </p>
        </section>

        {/* Section 4: Built for Real Coding Skills (5-step ordered list) */}
        <section
          aria-labelledby="about-skills-heading"
          className="flex flex-col gap-4"
        >
          <h2
            id="about-skills-heading"
            className="text-2xl font-semibold tracking-tight"
          >
            {t("skills.heading")}
          </h2>
          <p className="text-pretty text-muted-foreground">
            {t("skills.body1")}
          </p>
          <p className="text-pretty text-muted-foreground">
            {t("skills.body2")}
          </p>
          <p className="text-pretty text-muted-foreground">
            {t("skills.body3")}
          </p>
          <ol className="flex list-decimal flex-col gap-2 ps-6 text-pretty text-muted-foreground">
            <li>{t("skills.step1")}</li>
            <li>{t("skills.step2")}</li>
            <li>{t("skills.step3")}</li>
            <li>{t("skills.step4")}</li>
            <li>{t("skills.step5")}</li>
          </ol>
        </section>

        {/* Section 5: AI Tutor Support Inside the Learning Context */}
        <section
          aria-labelledby="about-tutor-heading"
          className="flex flex-col gap-4"
        >
          <h2
            id="about-tutor-heading"
            className="text-2xl font-semibold tracking-tight"
          >
            {t("tutor.heading")}
          </h2>
          <p className="text-pretty text-muted-foreground">{t("tutor.body1")}</p>
          <p className="text-pretty text-muted-foreground">{t("tutor.body2")}</p>
          <p className="text-pretty text-muted-foreground">{t("tutor.body3")}</p>
        </section>

        {/* Section 6: For Students Who Want to Build, Not Just Watch */}
        <section
          aria-labelledby="about-builders-heading"
          className="flex flex-col gap-4"
        >
          <h2
            id="about-builders-heading"
            className="text-2xl font-semibold tracking-tight"
          >
            {t("builders.heading")}
          </h2>
          <p className="text-pretty text-muted-foreground">
            {t("builders.body1")}
          </p>
          <p className="text-pretty text-muted-foreground">
            {t("builders.body2")}
          </p>
          <p className="text-pretty text-muted-foreground">
            {t("builders.body3")}
          </p>
          <p className="text-pretty text-muted-foreground">
            {t("builders.body4")}
          </p>
          <p className="text-pretty text-muted-foreground">
            {t("builders.body5")}
          </p>
        </section>
      </div>

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
