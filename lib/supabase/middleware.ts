import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

/** App sections that require a signed-in user. Extend as the app grows. */
const PROTECTED_SEGMENTS = ["profile", "dashboard"] as const

/**
 * Refreshes the Supabase session on every request and enforces route
 * protection. Auth cookies are written onto the response so a refreshed session
 * travels back to the browser.
 *
 * Protected routes are an allowlist so new public pages are not accidentally
 * gated. Everything not under a protected segment (home, login, the auth
 * handlers, the API) is public.
 *
 * @param request - The incoming request.
 * @param response - Optional base response to write cookies onto. The proxy
 *   passes the next-intl locale-routing response here so the locale rewrite
 *   headers and the refreshed auth cookies travel back on one response. When
 *   omitted, a fresh pass-through response is used.
 */
export async function updateSession(
  request: NextRequest,
  response?: NextResponse,
) {
  const supabaseResponse = response ?? NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // IMPORTANT: do not run code between createServerClient and getUser.
  // getUser refreshes the session if expired; skipping it risks random logouts.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isProtected = PROTECTED_SEGMENTS.some(
    (segment) => pathname === `/${segment}` || pathname.startsWith(`/${segment}/`),
  )

  if (!user && isProtected) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/login"
    loginUrl.search = ""
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}
