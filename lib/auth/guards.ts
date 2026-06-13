/**
 * @file lib/auth/guards.ts
 *
 * Thin server-only module that re-exports and aliases the existing auth
 * guards for use in admin surfaces.
 *
 * IMPORTANT - role mapping:
 *   "admin" in the UI == the INSTRUCTOR role in the database.
 *   The `user_roles` table stores `app_role` enum values: "instructor" | "student".
 *   There is no separate "admin" role. An instructor IS the admin.
 *
 * This module delegates all logic to:
 *   - {@link requireInstructor} from lib/auth/require-user.ts
 *   - {@link getCurrentUserRole} + {@link isInstructor} from lib/auth/roles.ts
 *
 * Do NOT duplicate the guard logic here. This file exists only so admin
 * modules can import from a stable `guards` path without depending on the
 * implementation details of require-user or roles.
 */

import { requireInstructor } from "@/lib/auth/require-user"
import { getCurrentUserRole } from "@/lib/auth/roles"

/**
 * Server-side guard for admin-only surfaces. Alias of {@link requireInstructor}.
 *
 * "Admin" == instructor in this project. There is no separate admin role;
 * the instructor role grants full CRUD on courses and lessons via RLS
 * (`private.is_admin()` checks the instructor role internally).
 *
 * Redirects:
 * - Signed-out visitors -> `/[locale]/login?notice=signInToContinue`
 * - Signed-in non-instructors -> `/[locale]/` (home)
 *
 * @returns The authenticated instructor user's id.
 */
export async function requireAdmin(): Promise<string> {
  return requireInstructor()
}

/**
 * Non-redirecting admin check. Returns `true` when the current user holds
 * the instructor role; `false` for students and `false` for anonymous visitors
 * (no redirect, no throw).
 *
 * Use this when you need to branch UI conditionally without a hard redirect,
 * e.g. showing/hiding an "Admin" link in the nav.
 *
 * @returns `true` when the current request is authenticated as an instructor.
 */
export async function getIsAdmin(): Promise<boolean> {
  const { isInstructor } = await getCurrentUserRole()
  return isInstructor
}
