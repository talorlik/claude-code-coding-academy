/**
 * Returns the canonical base URL of the application.
 *
 * Reads `NEXT_PUBLIC_APP_URL` (the authoritative env var). Falls back to
 * `NEXT_PUBLIC_SITE_URL` for backward compatibility during the transitional
 * period while deployments are updated, then to `http://localhost:3000` for
 * local development when neither is set.
 *
 * Use this helper everywhere a base URL is needed (canonical tags, Open
 * Graph, sitemap, robots, auth redirects). Never read either env var
 * directly; go through this function.
 */
export function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000"
  )
}
