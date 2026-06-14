"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { Search as SearchIcon } from "lucide-react"

import { Link } from "@/i18n/navigation"
import type { LessonSummary } from "@/lib/courses/types"
import { filterLessons } from "@/lib/courses/filter-lessons"

/**
 * In-course lesson search (Batch 19). Filters THIS course's already-loaded
 * lessons by title and description as the student types, and links each match
 * to that lesson (`?lesson=<slug>`). Scoped to one course - it does not search
 * across courses (the global search was retired in batch 18).
 *
 * Progressive enhancement: the lessons are passed in as a prop and the full
 * list renders on first paint, so with JavaScript disabled the student still
 * sees every lesson (the input simply does nothing). The filter is a pure
 * in-memory `includes` over the bounded lesson list - no network round-trip,
 * since a course's lessons are already fetched by the page.
 *
 * Client component (the live filtering needs state). Mobile-first and RTL-safe:
 * a full-width input and a single-column link list; long titles break.
 *
 * @param props.lessons - The course's lessons (ordered), already loaded by the
 *   page.
 * @param props.courseSlug - Slug used to build each lesson link.
 */
export function LessonSearch({
  lessons,
  courseSlug,
}: {
  lessons: LessonSummary[]
  courseSlug: string
}) {
  const t = useTranslations("Course.lessonSearch")
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => filterLessons(lessons, query), [lessons, query])

  return (
    <section aria-labelledby="lesson-search-heading" className="flex flex-col gap-3">
      <h2 id="lesson-search-heading" className="text-base font-semibold">
        {t("heading")}
      </h2>

      <div className="relative min-w-0">
        <SearchIcon
          className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("placeholder")}
          aria-label={t("inputLabel")}
          autoComplete="off"
          className="w-full rounded-lg border border-input bg-background py-2 pe-3 ps-9 text-sm placeholder:text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t("noResults", { query: query.trim() })}
        </p>
      ) : (
        <ul className="flex flex-col gap-1" aria-label={t("heading")}>
          {filtered.map((lesson) => (
            <li key={lesson.id} className="min-w-0">
              <Link
                href={`/courses/${courseSlug}?lesson=${lesson.slug}`}
                className="block min-w-0 break-words rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {lesson.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
