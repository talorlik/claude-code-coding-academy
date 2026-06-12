import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

/**
 * Request-scoped Supabase client using the publishable key. RLS applies and the
 * client acts on behalf of the signed-in user, reading and refreshing the
 * session from request cookies.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Called from a Server Component - the proxy handles refresh.
          }
        },
      },
    },
  )
}

/**
 * Privileged server-side client using the secret key. Bypasses RLS. It must NOT
 * read request cookies: @supabase/ssr would parse the user's auth-token cookie
 * and attach it as the Authorization bearer, and PostgREST honors that JWT's
 * role over the secret apikey - silently RLS-scoping the "admin" client to the
 * user. Returning no cookies leaves the secret key as the sole credential, so
 * the role resolves to service_role and RLS is bypassed as intended.
 */
export function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      cookies: {
        getAll() {
          return []
        },
        setAll() {
          // Admin client does not persist sessions.
        },
      },
    },
  )
}
