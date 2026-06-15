import { Suspense } from "react"
import Image from "next/image"
import { getTranslations, setRequestLocale } from "next-intl/server"
import type { Metadata } from "next"
import { BookOpen, Video, Code2, Users } from "lucide-react"

import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import { CourseCatalog } from "@/components/courses/course-catalog"
import { CourseCatalogSkeleton } from "@/components/courses/course-catalog-skeleton"
import { getCatalog } from "@/lib/catalog/queries"
import { createClient } from "@/lib/supabase/server"
import { getSiteUrl } from "@/lib/utils/site-url"
import type { Locale } from "@/i18n/routing"

/** How many of the newest courses the home page features. */
const HOME_COURSE_LIMIT = 3

/**
 * DESIGN.md button geometry (4px radius, 12x24 padding, Inter 500 14px) applied
 * to the hero CTAs via `className`. The shared {@link Button} ships shadcn's
 * `rounded-lg`/fixed-height sizing; the hero overrides it to the DESIGN.md spec
 * locally rather than mutating the global button (consumed app-wide). `h-auto`
 * unsets the variant's fixed height so the 12px vertical padding governs.
 */
const HERO_CTA_GEOMETRY =
  "h-auto rounded-[var(--radius-buttons)] px-6 py-3 text-sm font-medium"

/**
 * Intrinsic pixel dimensions of `public/brand/header_banner.png` (1672x941, a
 * ~16:9 dark IDE mockup). Passed to `next/image` so the browser reserves the
 * box and the hero never shifts as the artifact loads.
 */
const BANNER_WIDTH = 1672
const BANNER_HEIGHT = 941

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Metadata" })

  const baseUrl = getSiteUrl()

  return {
    title: t("home.title"),
    description: t("home.description"),
    openGraph: {
      title: t("home.title"),
      description: t("home.description"),
      siteName: t("home.siteName"),
      locale,
    },
    ...(baseUrl
      ? {
          alternates: {
            canonical: `${baseUrl}/${locale}`,
            languages: {
              en: `${baseUrl}/en`,
              he: `${baseUrl}/he`,
            },
          },
        }
      : {}),
  }
}

// ---------------------------------------------------------------------------
// Async catalog section
// ---------------------------------------------------------------------------

/**
 * Fetches the newest published courses and auth state server-side, then renders
 * the shared {@link CourseCatalog} grid limited to the {@link HOME_COURSE_LIMIT}
 * most-recently-added courses. Wrapped in Suspense by the parent so it shows a
 * skeleton while loading.
 *
 * Uses the same `getCatalog` loader and the same {@link CourseCard} as the
 * `/courses` catalog, so a course looks identical on the home page and the
 * catalog (ratings, category, and per-viewer progress included). Sorted
 * `newest` and sliced; on error it renders a localized error state.
 */
async function CatalogSection({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "Courses" })
  const tHome = await getTranslations({ locale, namespace: "Home" })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const userId = user?.id ?? null

  const courses = await getCatalog({ sort: "newest", userId }).catch((err) => {
    console.error("[home] getCatalog:", err)
    return null
  })

  // On error show a localized error state rather than crashing.
  if (courses === null) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BookOpen aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>{t("error.title")}</EmptyTitle>
          <EmptyDescription>{t("error.body")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  // Feature only the newest few; the full catalog lives at /courses.
  const featured = courses.slice(0, HOME_COURSE_LIMIT)

  return (
    <section aria-labelledby="catalog-heading">
      <div className="mb-8 text-center">
        <h2
          id="catalog-heading"
          className="text-2xl font-bold tracking-tight sm:text-3xl"
        >
          {tHome("catalog.heading")}
        </h2>
        <p className="mt-2 text-muted-foreground">{tHome("catalog.subhead")}</p>
      </div>
      <CourseCatalog
        courses={featured}
        userId={userId}
        ariaLabel={tHome("catalog.heading")}
      />
      <div className="mt-8 flex justify-center">
        <Button render={<Link href="/courses" />} variant="outline" className="min-w-0">
          {tHome("catalog.viewAll")}
        </Button>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Benefit card data (static, not i18n keys since we pass through t())
// ---------------------------------------------------------------------------

type BenefitKey = "structured" | "video" | "practical" | "community"

const BENEFIT_ICONS: Record<
  BenefitKey,
  React.ComponentType<{ className?: string; "aria-hidden"?: "true" }>
> = {
  structured: BookOpen,
  video: Video,
  practical: Code2,
  community: Users,
}

const BENEFIT_KEYS: BenefitKey[] = [
  "structured",
  "video",
  "practical",
  "community",
]

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/**
 * Localized home page. Renders the DESIGN.md hero (JetBrains Mono eyebrow, a
 * display headline with exactly one accent-highlighted word via the `<hl>`
 * rich-text tag, a dual CTA at DESIGN.md button geometry, and the
 * `header_banner.png` artifact framed at the large-block radius), the benefits
 * as Feature Cards, and the Suspense-wrapped {@link CatalogSection}. The single
 * `<h1>` lives in the hero; all copy comes from the `Home` namespace.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale as Locale)

  const t = await getTranslations("Home")

  return (
    <main id="main-content" className="flex flex-1 flex-col">
      {/* Hero: a centered editorial text stack over the canvas, immediately
          followed by the wide header_banner.png artifact (DESIGN.md hero). */}
      <section className="bg-background px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          {/* JetBrains Mono eyebrow above the headline (DESIGN.md Eyebrow). */}
          <p className="font-mono text-[length:var(--text-eyebrow)] font-medium tracking-[var(--tracking-eyebrow)] text-muted-foreground uppercase">
            {t("hero.eyebrow")}
          </p>
          {/* Single h1 at DESIGN.md display size with exactly one
              accent-highlighted word (the <hl> tag in the message). The
              highlighted run keeps the surrounding weight/size and only takes
              var(--color-accent) via the brand-accent utility. */}
          <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-[length:var(--text-display)] sm:leading-[var(--leading-display)] sm:tracking-[var(--tracking-display)]">
            {t.rich("hero.headline", {
              hl: (chunks) => (
                <span className="text-brand-accent">{chunks}</span>
              ),
            })}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-balance text-lg text-muted-foreground">
            {t("hero.subhead")}
          </p>
          {/* Dual CTA: filled primary + ghost secondary (never a lone primary),
              both at DESIGN.md button geometry. */}
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button
              render={<Link href="#catalog" />}
              className={`min-w-0 ${HERO_CTA_GEOMETRY}`}
            >
              {t("hero.ctaBrowse")}
            </Button>
            <Button
              render={<Link href="/register" />}
              variant="outline"
              className={`min-w-0 ${HERO_CTA_GEOMETRY}`}
            >
              {t("hero.ctaStart")}
            </Button>
          </div>
        </div>

        {/* The wide hero artifact: a dark IDE mockup framed at the large-block
            radius. Flush on the canvas in dark mode; a framed dark code panel on
            cream in light mode (intentional, DESIGN.md). Explicit intrinsic
            dimensions + h-auto reserve the box so there is no layout shift, and
            the max-width keeps it from overflowing at 390/768/1280. */}
        <div className="mx-auto mt-12 max-w-5xl">
          <Image
            src="/brand/header_banner.png"
            alt={t("hero.bannerAlt")}
            width={BANNER_WIDTH}
            height={BANNER_HEIGHT}
            priority
            sizes="(max-width: 1024px) 100vw, 1024px"
            className="h-auto w-full rounded-[var(--radius-large-blocks)] border border-border"
          />
        </div>
      </section>

      {/* Benefits: DESIGN.md Feature Cards. */}
      <section className="px-4 py-16" aria-labelledby="benefits-heading">
        <div className="mx-auto max-w-5xl">
          <h2
            id="benefits-heading"
            className="mb-10 text-center text-2xl font-bold tracking-tight sm:text-3xl"
          >
            {t("benefits.heading")}
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFIT_KEYS.map((key) => {
              const Icon = BENEFIT_ICONS[key]
              return (
                <div
                  key={key}
                  className="flex min-w-0 flex-col gap-3 rounded-[var(--radius-cards)] border border-border bg-card p-6 text-start"
                >
                  {/* Accent icon, top-left (DESIGN.md Feature Card). */}
                  <Icon className="size-6 text-brand-accent" aria-hidden="true" />
                  <h3 className="text-base font-semibold text-foreground">
                    {t(`benefits.${key}.title`)}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t(`benefits.${key}.body`)}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Course catalog */}
      <section
        id="catalog"
        className="bg-muted/20 px-4 py-16"
        aria-label="Course catalog"
      >
        <div className="mx-auto max-w-6xl">
          <Suspense fallback={<CourseCatalogSkeleton />}>
            <CatalogSection locale={locale} />
          </Suspense>
        </div>
      </section>
    </main>
  )
}
