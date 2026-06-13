import { createBrowserClient } from "@supabase/ssr"

import type { Database } from "@/lib/supabase/database.types"

/**
 * Browser-side Supabase client. Safe to use in Client Components.
 * Uses the publishable key, which is designed to be exposed to the browser.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
}
