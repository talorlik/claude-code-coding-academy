import { redirect } from "@/i18n/navigation"
import type { Locale } from "@/i18n/routing"

/**
 * Legacy `/search` route.
 *
 * Batch 18 replaced the standalone global search with the `/courses` catalog,
 * whose search box performs the course-level search. This route now permanently
 * forwards to `/courses`, preserving an incoming `?q=` as the catalog search
 * term so old links and bookmarks keep working. Lesson-level search moved to
 * the course detail page (batch 19); the global cross-course lesson search the
 * old page offered is intentionally gone.
 *
 * Locale-aware: uses the next-intl {@link redirect} so the target keeps the
 * active locale prefix.
 */
export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string }>
}) {
  const { locale } = await params
  const { q } = await searchParams

  const href = q ? `/courses?q=${encodeURIComponent(q)}` : "/courses"
  redirect({ href, locale: locale as Locale })
}
