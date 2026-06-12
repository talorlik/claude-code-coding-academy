import { createClient } from "@/lib/supabase/server"

/**
 * Whether the given user has the instructor role. Reads `user_roles` through the
 * request-scoped client; RLS lets a signed-in user read their own role rows.
 * Returns false when `userId` is absent or no instructor row exists.
 */
export async function isInstructor(
  userId: string | null | undefined
): Promise<boolean> {
  if (!userId) return false

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "instructor")
    .maybeSingle()

  if (error) return false
  return data !== null
}

/**
 * Resolves the current user's id and instructor status in one call. Uses
 * `getUser()` (revalidates the session) rather than trusting the unverified
 * cookie.
 */
export async function getCurrentUserRole(): Promise<{
  userId: string | null
  isInstructor: boolean
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { userId: null, isInstructor: false }

  return { userId: user.id, isInstructor: await isInstructor(user.id) }
}
