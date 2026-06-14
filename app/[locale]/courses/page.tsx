import { Suspense } from "react"
import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { BookOpen } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { getCatalog, getCategories } from "@/lib/catalog/queries"
import { catalogQuerySchema } from "@/lib/validation/catalog"
import { CatalogFilters } from "@/components/catalog/catalog-filters"
import { CatalogCourseCard } from "@/components/courses/catalog-course-card"
import { CourseCatalogSkeleton } from "@/components/courses/course-catalog-skeleton"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import type { Locale } from "@/i18n/routing"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Catalog" })
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

/** Raw `/courses` query params before validation. All optional. */
type RawSearchParams = {
  q?: string
  category?: string
  sort?: string
  mine?: string
}

/**
 * Public `/courses` catalog page (Batch 18).
 *
 * A Udemy-style browse experience: a category filter, course-level search, a
 * sort control (Most popular | Highest rated | Newest), and a "My Courses"
 * toggle for signed-in viewers. All filter state lives in the URL query params
 * (`?q=&category=&sort=&mine=1`), so the page is fully no-JS navigable and
 * shareable - the {@link CatalogFilters} native GET form sets them.
 *
 * Server component: `setRequestLocale` then `getTranslations`; one
 * `<main id="main-content">` and one `<h1>`. The query params are parsed
 * through {@link catalogQuerySchema}, which coerces junk values to defaults
 * rather than erroring. The grid is wrapped in Suspense with a skeleton.
 */
export default async function CoursesCatalogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<RawSearchParams>
}) {
  const { locale } = await params
  setRequestLocale(locale as Locale)

  const raw = await searchParams
  const query = catalogQuerySchema.parse(raw)

  const t = await getTranslations("Catalog")

  return (
    <main id="main-content" className="flex flex-1 flex-col px-4 py-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {t("title")}
          </h1>
          <p className="max-w-2xl text-pretty text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>

        <Suspense fallback={<CourseCatalogSkeleton />}>
          <CatalogSection locale={locale} query={query} />
        </Suspense>
      </div>
    </main>
  )
}

/**
 * Loads the auth context, categories, and filtered/sorted catalog, then renders
 * the filter bar and the result grid (or a localized empty state). Split out so
 * the page can stream it behind a Suspense skeleton.
 */
async function CatalogSection({
  locale,
  query,
}: {
  locale: string
  query: ReturnType<typeof catalogQuerySchema.parse>
}) {
  const t = await getTranslations("Catalog")
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const userId = user?.id ?? null

  const [categories, courses] = await Promise.all([
    getCategories(),
    getCatalog({
      q: query.q,
      categorySlug: query.category,
      mine: query.mine,
      sort: query.sort,
      userId,
    }),
  ])

  return (
    <div className="flex flex-col gap-6">
      <CatalogFilters
        locale={locale}
        categories={categories}
        q={query.q ?? ""}
        category={query.category ?? ""}
        sort={query.sort}
        mine={query.mine}
        showMine={userId !== null}
      />

      {courses.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpen />
            </EmptyMedia>
            <EmptyTitle>{t("empty.title")}</EmptyTitle>
            <EmptyDescription>{t("empty.body")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div
          className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
          role="list"
          aria-label={t("title")}
        >
          {courses.map((course) => (
            <div key={course.id} className="min-w-0" role="listitem">
              <CatalogCourseCard course={course} userId={userId} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
