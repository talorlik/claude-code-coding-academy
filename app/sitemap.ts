/**
 * Dynamic sitemap generation for public pages.
 *
 * Lists the home page (EN + HE) and all published course pages. Private pages
 * (dashboard, admin, chat, auth flows) are intentionally excluded - those are
 * covered by noindex metadata and not linked from here.
 *
 * Falls back gracefully when NEXT_PUBLIC_APP_URL / NEXT_PUBLIC_SITE_URL is not
 * set (e.g. local dev): returns only the static entries with a relative-path
 * base of "" so Next.js still generates the file without crashing.
 */

import type { MetadataRoute } from "next"
import { getPublishedCourses } from "@/lib/courses/queries"

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  ""

const LOCALES = ["en", "he"] as const

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages: home (both locales).
  const staticEntries: MetadataRoute.Sitemap = LOCALES.map((locale) => ({
    url: `${BASE_URL}/${locale}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 1.0,
    alternates: {
      languages: {
        en: `${BASE_URL}/en`,
        he: `${BASE_URL}/he`,
      },
    },
  }))

  // Dynamic pages: published courses (both locales).
  let courseEntries: MetadataRoute.Sitemap = []
  try {
    const courses = await getPublishedCourses()
    courseEntries = courses.flatMap((course) =>
      LOCALES.map((locale) => ({
        url: `${BASE_URL}/${locale}/courses/${course.slug}`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.8,
        alternates: {
          languages: {
            en: `${BASE_URL}/en/courses/${course.slug}`,
            he: `${BASE_URL}/he/courses/${course.slug}`,
          },
        },
      }))
    )
  } catch {
    // Non-fatal: DB unavailable at build time (e.g. no env). Sitemap still
    // emits the static home entries.
  }

  return [...staticEntries, ...courseEntries]
}
