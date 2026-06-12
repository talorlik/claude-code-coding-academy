"use server"

import { createClient } from "@/lib/supabase/server"
import type { ActionResult } from "@/lib/types/action-result"
import { fail, ok } from "@/lib/types/action-result"

/**
 * Ensures a `profiles` row exists for the given user, creating an empty one if
 * absent. Idempotent. Called after authentication so every signed-in user has a
 * profile to edit. Failures are swallowed: a missing profile must never block
 * sign-in.
 */
export async function ensureProfile(userId: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from("profiles")
    .upsert(
      { user_id: userId },
      { onConflict: "user_id", ignoreDuplicates: true }
    )
}

/**
 * Changes the current user's password via Supabase Auth. Requires an active
 * session. Enforces a minimum length matching the signup policy.
 */
export async function updatePassword(
  password: string
): Promise<ActionResult<null>> {
  if (password.length < 8) {
    return fail("Password must be at least 8 characters.", {
      password: "Too short.",
    })
  }
  // Upper bound so a pathological input cannot tie up the password hasher.
  if (password.length > 1000) {
    return fail("Password is too long.", { password: "Too long." })
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return fail("Could not update your password.")

  return ok(null)
}
