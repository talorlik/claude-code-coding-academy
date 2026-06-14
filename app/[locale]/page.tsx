import { Suspense } from "react"
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
      {/* Hero */}
      <section className="bg-gradient-to-b from-background to-muted/30 px-4 py-16 text-center sm:py-24">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-5xl">
            {t("hero.headline")}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-balance text-lg text-muted-foreground">
            {t("hero.subhead")}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button
              render={<Link href="#catalog" />}
              size="lg"
              className="min-w-0"
            >
              {t("hero.ctaBrowse")}
            </Button>
            <Button
              render={<Link href="/register" />}
              size="lg"
              variant="outline"
              className="min-w-0"
            >
              {t("hero.ctaStart")}
            </Button>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section
        className="px-4 py-16"
        aria-labelledby="benefits-heading"
      >
        <div className="mx-auto max-w-5xl">
          <h2
            id="benefits-heading"
            className="mb-10 text-center text-2xl font-bold tracking-tight sm:text-3xl"
          >
            {t("benefits.heading")}
          </h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFIT_KEYS.map((key) => {
              const Icon = BENEFIT_ICONS[key]
              return (
                <div
                  key={key}
                  className="flex min-w-0 flex-col items-center gap-3 text-center"
                >
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon aria-hidden="true" />
                  </div>
                  <h3 className="font-semibold">
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
