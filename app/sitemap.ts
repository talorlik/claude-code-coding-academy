/**
 * Dynamic sitemap generation for public pages.
 *
 * Lists the home page (EN + HE) and all published course pages. Private pages
 * (dashboard, admin, auth flows) are intentionally excluded - those are
 * covered by noindex metadata and not linked from here.
 */

import type { MetadataRoute } from "next"

import { getPublishedCourses } from "@/lib/courses/queries"
import { getSiteUrl } from "@/lib/utils/site-url"

const BASE_URL = getSiteUrl()

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
