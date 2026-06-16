import { getTranslations } from "next-intl/server"
import { Search as SearchIcon } from "lucide-react"

import type { CatalogCategory, CatalogSort } from "@/lib/catalog/types"
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select"

/**
 * The catalog filter bar: search box, category select, sort select, and a
 * "My Courses" checkbox. Implemented as a single native GET `<form>` that
 * submits to `/{locale}/courses`, so all filtering works with no JavaScript -
 * the browser serializes the controls into the `?q=&category=&sort=&mine=1`
 * query string the page reads back. A submit button is always present for the
 * no-JS path; `onchange`-style enhancement is intentionally omitted to keep the
 * component server-rendered and dependency-free.
 *
 * Server component. Mobile-first: the controls stack in a single column on
 * narrow screens and flow into a wrapping row from `sm` up; every control sets
 * `min-w-0` so nothing forces horizontal overflow, and the row uses logical
 * (RTL-safe) spacing.
 *
 * @param props.locale - Active locale, used for the form action path.
 * @param props.categories - Localized category list for the category select.
 * @param props.q - Current search term (prefills the input).
 * @param props.category - Current category slug (selected option).
 * @param props.sort - Current sort (selected option).
 * @param props.mine - Whether "My Courses" is active (checkbox state).
 * @param props.showMine - Whether to render the "My Courses" control at all
 *   (hidden for anonymous visitors, who have no enrollment context).
 */
export async function CatalogFilters({
  locale,
  categories,
  q,
  category,
  sort,
  mine,
  showMine,
}: {
  locale: string
  categories: CatalogCategory[]
  q: string
  category: string
  sort: CatalogSort
  mine: boolean
  showMine: boolean
}) {
  const t = await getTranslations("Catalog")

  return (
    <form
      method="GET"
      action={`/${locale}/courses`}
      role="search"
      aria-label={t("filtersLabel")}
      className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:flex-wrap sm:items-end"
    >
      {/* Search */}
      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:min-w-[12rem]">
        <label htmlFor="catalog-q" className="text-xs text-muted-foreground">
          {t("searchLabel")}
        </label>
        <div className="relative min-w-0">
          <SearchIcon
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            id="catalog-q"
            type="search"
            name="q"
            defaultValue={q}
            placeholder={t("searchPlaceholder")}
            autoComplete="off"
            className="w-full rounded-lg border border-input bg-background py-2 pe-3 ps-9 text-sm placeholder:text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          />
        </div>
      </div>

      {/* Category */}
      <div className="flex min-w-0 flex-col gap-1">
        <label
          htmlFor="catalog-category"
          className="text-xs text-muted-foreground"
        >
          {t("categoryLabel")}
        </label>
        <NativeSelect
          id="catalog-category"
          name="category"
          defaultValue={category}
          className="w-full"
        >
          <NativeSelectOption value="">{t("allCategories")}</NativeSelectOption>
          {categories.map((c) => (
            <NativeSelectOption key={c.id} value={c.slug}>
              {c.name}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>

      {/* Sort */}
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor="catalog-sort" className="text-xs text-muted-foreground">
          {t("sortLabel")}
        </label>
        <NativeSelect
          id="catalog-sort"
          name="sort"
          defaultValue={sort}
          className="w-full"
        >
          <NativeSelectOption value="popular">
            {t("sort.popular")}
          </NativeSelectOption>
          <NativeSelectOption value="rated">
            {t("sort.rated")}
          </NativeSelectOption>
          <NativeSelectOption value="newest">
            {t("sort.newest")}
          </NativeSelectOption>
        </NativeSelect>
      </div>

      {/* My Courses (signed-in only) */}
      {showMine ? (
        <label className="flex shrink-0 items-center gap-2 text-sm sm:pb-2">
          <input
            type="checkbox"
            name="mine"
            value="1"
            defaultChecked={mine}
            className="size-4 rounded border-input"
          />
          {t("myCourses")}
        </label>
      ) : null}

      <button
        type="submit"
        className="shrink-0 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:pb-2"
      >
        {t("apply")}
      </button>
    </form>
  )
}
