/**
 * robots.txt generation.
 *
 * Allows all crawlers on public pages and disallows all private ones
 * (dashboard, admin, auth flows, API routes). The sitemap URL is included so
 * crawlers can discover public pages efficiently.
 *
 * Private-page noindex is belt-and-suspenders: the metadata robots directive
 * set in each private page/layout is the primary signal; this Disallow is the
 * secondary signal at the robots.txt level.
 */

import type { MetadataRoute } from "next"

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  ""

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/*dashboard*",
          "/*admin*",
          "/api/",
          "/auth/",
          "/*chat*",
          "/*reset-password*",
          "/*forgot-password*",
        ],
      },
    ],
    sitemap: BASE_URL ? `${BASE_URL}/sitemap.xml` : undefined,
  }
}
