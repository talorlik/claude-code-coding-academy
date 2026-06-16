import "server-only"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { requireAdmin } from "@/lib/auth/guards"
import type { Database } from "@/lib/supabase/database.types"
import type { ActionResult } from "@/lib/types/action-result"
import { fail, ok } from "@/lib/types/action-result"
import type { RoleValue } from "@/lib/validation/admin-users"

/**
 * Server-only data layer for admin user management (Batch 26).
 *
 * Every exported function calls {@link requireAdmin} FIRST. Behind that gate it
 * uses a service-role Supabase client built from `SUPABASE_SECRET_KEY`, which
 * bypasses RLS - the only way to read and mutate across users, since RLS scopes
 * a normal session to its own rows. The `import "server-only"` directive makes a
 * client-component import a build error, so the secret key can never reach the
 * browser bundle.
 *
 * Two safety invariants are enforced here in the data layer (not just the UI),
 * so they hold regardless of how the function is called:
 *   1. Self-protection: an admin cannot delete, disable, or demote their OWN
 *      account from this surface.
 *   2. Last-instructor guard: the final instructor cannot be demoted or deleted,
 *      so the platform can never be locked out of its own admin area.
 *
 * Listing is set-based: one `auth.admin.listUsers` page, then bulk reads of
 * `user_roles`, `profiles`, and `enrollments` filtered by the page's user ids
 * (`.in(...)`), merged in memory. No per-user query loop (no N+1).
 */

/** A row in the paginated admin users table. */
export interface AdminUserRow {
  /** The user's auth id (UUID). */
  id: string
  /** The user's email, or `null` if Supabase has none on file. */
  email: string | null
  /** Display name from `profiles.full_name`, or `null`. */
  fullName: string | null
  /** The user's application role; defaults to `student` when no row exists. */
  role: RoleValue
  /** ISO timestamp the auth user was created. */
  createdAt: string
  /** Number of course enrollments owned by this user. */
  enrollmentCount: number
  /** Whether the account is currently disabled (banned). */
  disabled: boolean
}

/** A single page of admin users plus pagination metadata. */
export interface AdminUserPage {
  /** The users on this page. */
  users: AdminUserRow[]
  /** The 1-based page number this result represents. */
  page: number
  /** The page size requested. */
  perPage: number
  /** Whether a subsequent page exists. */
  hasMore: boolean
}

/** Detail view of one user, including derived state for the actions panel. */
export interface AdminUserDetail extends AdminUserRow {
  /** Phone number from `profiles.phone`, or `null`. */
  phone: string | null
  /** Preferred locale from `profiles.locale`. */
  locale: string | null
}

/** Default page size for the users table. */
export const USERS_PAGE_SIZE = 25

/**
 * Builds the privileged service-role client. Uses `@supabase/supabase-js`
 * directly (not the SSR helper) because the `auth.admin.*` namespace - list,
 * invite, update, delete users - is only reliably available on a client created
 * with the secret key and no session persistence. Mirrors `scripts/seed.mjs`.
 */
function adminClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secret = process.env.SUPABASE_SECRET_KEY
  if (!url || !secret) {
    throw new Error(
      "Admin user management requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY."
    )
  }
  return createClient<Database>(url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/**
 * Whether an auth user is currently banned. Supabase exposes the ban as a
 * `banned_until` timestamp on the admin user object; a future timestamp means
 * the account is disabled. The field is not in the generated types, so it is
 * read defensively.
 */
function isBanned(user: { banned_until?: string | null }): boolean {
  const until = user.banned_until
  if (!until) return false
  const ts = Date.parse(until)
  // A NaN parse (unexpected format) is treated as "not banned" rather than
  // silently disabling an account.
  return Number.isNaN(ts) ? false : ts > Date.now()
}

/**
 * Counts users holding the instructor role. Used by the last-instructor guard.
 * A single aggregate query, not a scan.
 */
async function countInstructors(
  admin: SupabaseClient<Database>
): Promise<number> {
  const { count, error } = await admin
    .from("user_roles")
    .select("user_id", { count: "exact", head: true })
    .eq("role", "instructor")
  if (error) throw new Error(`countInstructors: ${error.message}`)
  return count ?? 0
}

/** Reads a single user's current role, defaulting to `student`. */
async function readRole(
  admin: SupabaseClient<Database>,
  userId: string
): Promise<RoleValue> {
  const { data } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle()
  return (data?.role as RoleValue | undefined) ?? "student"
}

/**
 * Sets a user's role to exactly one value. The `user_roles` primary key is the
 * composite `(user_id, role)`, with no unique constraint on `user_id` alone, so
 * a plain upsert keyed on `user_id` has no conflict target and would accumulate
 * a second row instead of switching the role. The model here is one role per
 * user, so this clears any existing role rows for the user and inserts the new
 * one, leaving a single authoritative row.
 *
 * @returns A Postgres error object, or `null` on success.
 */
async function writeRole(
  admin: SupabaseClient<Database>,
  userId: string,
  role: RoleValue
): Promise<{ message: string } | null> {
  const { error: deleteError } = await admin
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
  if (deleteError) return deleteError

  const { error: insertError } = await admin
    .from("user_roles")
    .insert({ user_id: userId, role })
  return insertError
}

/**
 * Lists users for the admin table, paginated and set-based.
 *
 * Pulls one page of auth users, then resolves roles, display names, and
 * enrollment counts with three bulk queries filtered by the page's user ids and
 * merges them in memory. No per-user query.
 *
 * @param page - 1-based page number (defaults to 1).
 * @param perPage - page size (defaults to {@link USERS_PAGE_SIZE}).
 * @returns The page of users, or a failed {@link ActionResult} on error.
 */
export async function listUsers(
  page = 1,
  perPage = USERS_PAGE_SIZE
): Promise<ActionResult<AdminUserPage>> {
  await requireAdmin()
  const admin = adminClient()

  const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
  if (error) return fail("Could not load users.")

  const authUsers = data.users
  const ids = authUsers.map((u) => u.id)

  // Bulk reads filtered to this page's ids - the set-based pattern that keeps
  // listing O(1) queries instead of O(n).
  const [rolesRes, profilesRes, enrollmentsRes] = await Promise.all([
    admin.from("user_roles").select("user_id, role").in("user_id", ids),
    admin.from("profiles").select("user_id, full_name").in("user_id", ids),
    admin.from("enrollments").select("user_id").in("user_id", ids),
  ])

  const roleByUser = new Map<string, RoleValue>()
  for (const row of rolesRes.data ?? []) {
    roleByUser.set(row.user_id, row.role as RoleValue)
  }

  const nameByUser = new Map<string, string | null>()
  for (const row of profilesRes.data ?? []) {
    nameByUser.set(row.user_id, row.full_name)
  }

  const enrollmentCountByUser = new Map<string, number>()
  for (const row of enrollmentsRes.data ?? []) {
    enrollmentCountByUser.set(
      row.user_id,
      (enrollmentCountByUser.get(row.user_id) ?? 0) + 1
    )
  }

  const users: AdminUserRow[] = authUsers.map((u) => ({
    id: u.id,
    email: u.email ?? null,
    fullName: nameByUser.get(u.id) ?? null,
    role: roleByUser.get(u.id) ?? "student",
    createdAt: u.created_at,
    enrollmentCount: enrollmentCountByUser.get(u.id) ?? 0,
    disabled: isBanned(u as { banned_until?: string | null }),
  }))

  return ok({
    users,
    page,
    perPage,
    // A full page implies there may be another; a short page is the last.
    hasMore: authUsers.length === perPage,
  })
}

/**
 * Loads one user's detail, including profile fields and derived state.
 *
 * @param userId - The target user's auth id.
 * @returns The user detail, or a failed {@link ActionResult} when not found.
 */
export async function getUser(
  userId: string
): Promise<ActionResult<AdminUserDetail>> {
  await requireAdmin()
  const admin = adminClient()

  const { data, error } = await admin.auth.admin.getUserById(userId)
  if (error || !data.user) return fail("userNotFound")

  const authUser = data.user

  const [{ data: profile }, { count: enrollmentCount }] = await Promise.all([
    admin
      .from("profiles")
      .select("full_name, phone, locale")
      .eq("user_id", userId)
      .maybeSingle(),
    admin
      .from("enrollments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ])

  const role = await readRole(admin, userId)

  return ok({
    id: authUser.id,
    email: authUser.email ?? null,
    fullName: profile?.full_name ?? null,
    phone: profile?.phone ?? null,
    locale: profile?.locale ?? null,
    role,
    createdAt: authUser.created_at,
    enrollmentCount: enrollmentCount ?? 0,
    disabled: isBanned(authUser as { banned_until?: string | null }),
  })
}

/**
 * Sets a user's application role (instructor <-> student) by upserting their
 * `user_roles` row.
 *
 * Guards (enforced here, not just the UI):
 *   - Self-protection: an admin cannot demote their own account.
 *   - Last-instructor: the final instructor cannot be demoted to student, so the
 *     admin area can never be locked out.
 *
 * @param userId - The target user's auth id.
 * @param role - The role to set.
 * @returns A failed {@link ActionResult} carrying a guard code, or `ok(null)`.
 */
export async function setUserRole(
  userId: string,
  role: RoleValue
): Promise<ActionResult<null>> {
  const callerId = await requireAdmin()
  const admin = adminClient()

  // Self-protection: never demote yourself (promoting yourself is a no-op since
  // an admin IS an instructor, but a self-demotion would risk lockout).
  if (userId === callerId && role === "student") {
    return fail("cannotSelf")
  }

  // Last-instructor guard: refuse to demote the only remaining instructor.
  if (role === "student") {
    const current = await readRole(admin, userId)
    if (current === "instructor") {
      const instructorCount = await countInstructors(admin)
      if (instructorCount <= 1) return fail("lastInstructor")
    }
  }

  const error = await writeRole(admin, userId, role)
  if (error) return fail("roleChangeFailed")

  return ok(null)
}

/**
 * Invites a new user by email via Supabase's built-in invite flow, then assigns
 * the requested role. The invite email (using the configured Auth invite
 * template) carries a magic link; the role row is written immediately so the
 * account has its role on first sign-in.
 *
 * @param email - The invitee's email (validated and normalized upstream).
 * @param role - The role to assign on acceptance.
 * @returns `ok(null)` on a sent invite, or a failed {@link ActionResult}.
 */
export async function inviteUser(
  email: string,
  role: RoleValue
): Promise<ActionResult<null>> {
  await requireAdmin()
  const admin = adminClient()

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email)
  if (error || !data.user) return fail("inviteFailed")

  // Assign the role up front so the invited user lands with the right role.
  const roleError = await writeRole(admin, data.user.id, role)
  if (roleError) return fail("inviteFailed")

  return ok(null)
}

/**
 * Enables or disables (reactivates or bans) a user account. Disabling sets a
 * long `ban_duration` so sign-in is blocked; enabling clears it with `"none"`.
 * Reversible by design - no data is touched, only the ban window.
 *
 * Self-protection: an admin cannot disable their own account.
 *
 * @param userId - The target user's auth id.
 * @param disabled - `true` to ban, `false` to lift the ban.
 * @returns `ok(null)`, or a failed {@link ActionResult} carrying a guard code.
 */
export async function setUserDisabled(
  userId: string,
  disabled: boolean
): Promise<ActionResult<null>> {
  const callerId = await requireAdmin()
  const admin = adminClient()

  if (userId === callerId && disabled) {
    return fail("cannotSelf")
  }

  // A very long ban approximates "disabled until reactivated"; "none" lifts it.
  // ban_duration is not in the generated types for updateUserById, so the
  // attributes object is cast at the call site.
  const ban_duration = disabled ? "876000h" : "none" // ~100 years
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration,
  } as { ban_duration: string })
  if (error) return fail("disableFailed")

  return ok(null)
}

/**
 * Permanently deletes a user. Foreign keys cascade from `auth.users`, so
 * enrollments, lesson progress, the profile, and role rows are removed with the
 * account.
 *
 * Guards (enforced here, not just the UI):
 *   - Self-protection: an admin cannot delete their own account.
 *   - Last-instructor: the final instructor cannot be deleted.
 *
 * @param userId - The target user's auth id.
 * @returns `ok(null)`, or a failed {@link ActionResult} carrying a guard code.
 */
export async function deleteUser(
  userId: string
): Promise<ActionResult<null>> {
  const callerId = await requireAdmin()
  const admin = adminClient()

  if (userId === callerId) {
    return fail("cannotSelf")
  }

  // Last-instructor guard: deleting the only instructor would lock out admin.
  const role = await readRole(admin, userId)
  if (role === "instructor") {
    const instructorCount = await countInstructors(admin)
    if (instructorCount <= 1) return fail("lastInstructor")
  }

  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return fail("deleteFailed")

  return ok(null)
}
