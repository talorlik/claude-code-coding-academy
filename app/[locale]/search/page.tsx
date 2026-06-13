import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Search as SearchIcon } from "lucide-react"

import { searchPublished } from "@/lib/search/queries"
import { searchQuerySchema } from "@/lib/validation/search"
import { Link } from "@/i18n/navigation"
import type { Locale } from "@/i18n/routing"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Search" })
  return { title: t("pageTitle") }
}

/**
 * Search page - public, no auth required.
 *
 * Works without JavaScript: the form uses GET method so the browser submits
 * ?q=<query> to the same URL. The server reads the `q` searchParam and
 * runs the query via the `search_documents` view.
 *
 * Results are grouped into Courses and Lessons sections.
 */
export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale as Locale)

  const { q: rawQ } = await searchParams
  const t = await getTranslations("Search")

  // Validate the query. On validation failure treat as empty (no results).
  const parsed = searchQuerySchema.safeParse({ q: rawQ ?? "" })
  const query = parsed.success ? parsed.data.q : ""

  const results = query
    ? await searchPublished(query, locale)
    : { courses: [], lessons: [] }

  const totalResults = results.courses.length + results.lessons.length

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-3xl min-w-0 px-4 py-8"
    >
      <h1 className="mb-6 text-2xl font-semibold text-foreground">
        {t("pageTitle")}
      </h1>

      {/* Search form - works without JS via GET */}
      <form
        method="GET"
        action={`/${locale}/search`}
        className="mb-8 flex min-w-0 gap-2"
        role="search"
      >
        <label htmlFor="search-input" className="sr-only">
          {t("inputLabel")}
        </label>
        <div className="relative min-w-0 flex-1">
          <SearchIcon
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id="search-input"
            type="search"
            name="q"
            defaultValue={rawQ ?? ""}
            placeholder={t("inputPlaceholder")}
            autoComplete="off"
            className="w-full rounded-lg border border-input bg-background py-2 pe-3 ps-9 text-sm placeholder:text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
        </div>
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {t("search")}
        </button>
      </form>

      {/* Results */}
      {!query ? (
        <p className="text-sm text-muted-foreground">{t("emptyQuery")}</p>
      ) : totalResults === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <p className="font-medium text-foreground">
            {t("noResults", { query })}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("noResultsBody")}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          <p className="text-sm text-muted-foreground">
            {t("resultsFor", { query })}
          </p>

          {/* Course results */}
          {results.courses.length > 0 && (
            <section aria-labelledby="search-courses-heading">
              <h2
                id="search-courses-heading"
                className="mb-3 text-base font-semibold text-foreground"
              >
                {t("courses")}
              </h2>
              <ul className="flex flex-col gap-3">
                {results.courses.map((result) => (
                  <li key={result.id}>
                    <Link
                      href={`/courses/${result.slug}`}
                      className="flex min-w-0 flex-col gap-1 rounded-lg border bg-card p-4 hover:bg-accent/40 transition-colors"
                    >
                      <span className="break-words font-medium text-foreground">
                        {result.title}
                      </span>
                      {result.snippet && (
                        <span className="line-clamp-2 text-sm text-muted-foreground">
                          {result.snippet}
                        </span>
                      )}
                      <span className="mt-1 text-xs text-primary">
                        {t("viewCourse")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Lesson results */}
          {results.lessons.length > 0 && (
            <section aria-labelledby="search-lessons-heading">
              <h2
                id="search-lessons-heading"
                className="mb-3 text-base font-semibold text-foreground"
              >
                {t("lessons")}
              </h2>
              <ul className="flex flex-col gap-3">
                {results.lessons.map((result) => {
                  const href = result.courseSlug
                    ? `/courses/${result.courseSlug}?lesson=${result.slug}`
                    : `/courses`
                  return (
                    <li key={result.id}>
                      <Link
                        href={href}
                        className="flex min-w-0 flex-col gap-1 rounded-lg border bg-card p-4 hover:bg-accent/40 transition-colors"
                      >
                        <span className="break-words font-medium text-foreground">
                          {result.title}
                        </span>
                        {result.courseSlug && (
                          <span className="text-xs text-muted-foreground">
                            {t("lessonIn", { course: result.courseSlug })}
                          </span>
                        )}
                        {result.snippet && (
                          <span className="line-clamp-2 text-sm text-muted-foreground">
                            {result.snippet}
                          </span>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </div>
      )}
    </main>
  )
}
