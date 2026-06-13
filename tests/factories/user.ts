import {
  deterministicUuid,
  ENTITY_CODES,
  FACTORY_TIMESTAMP,
  nextSequence,
} from "./sequence"

/**
 * Application role mirroring the `app_role` Postgres enum in the `profiles`
 * table (via the `role` join from `user_roles`). The DB enum is
 * `"instructor" | "student"` but tests use "student" | "admin" as a minimal
 * fixture shape - see divergences note below.
 */
export type UserRole = "student" | "admin"

/**
 * UI locale per the `profiles.locale` column.
 */
export type UserLocale = "en" | "he"

/**
 * Minimal user fixture record used in tests.
 *
 * Intentionally diverges from `Database["public"]["Tables"]["profiles"]["Row"]`
 * on several points:
 * - `id` here maps to `auth.users.id` (the user's UUID); the `profiles` Row
 *   uses `user_id` for this and has no `id` column.
 * - `email` is `string` (never null) because factory emails are always set;
 *   the DB column is `string | null`.
 * - `full_name` is `string` (never null) for the same reason; the DB column
 *   is `string | null`.
 * - `role` is a simplified local enum; the real role lives in a separate
 *   `user_roles` table and is not a direct column of `profiles`.
 * - The DB `profiles` Row has a `phone: string | null` column not included
 *   here because no test needs it.
 *
 * These divergences are deliberate: the factory produces auth-user-shaped
 * fixtures, not raw DB rows. Do not collapse this type into the generated
 * `profiles` Row without addressing all call sites.
 */
export interface UserFactoryRecord {
  id: string
  email: string
  full_name: string
  avatar_url: string | null
  role: UserRole
  locale: UserLocale
  created_at: string
  updated_at: string
}

/**
 * Builds a deterministic user (profile) record.
 *
 * Each call consumes one number from the shared factory sequence. Emails
 * always use the reserved example.com domain so no factory output can ever
 * reach a real mailbox. Overrides always win over generated values.
 */
export function buildUser(
  overrides: Partial<UserFactoryRecord> = {}
): UserFactoryRecord {
  const seq = nextSequence()
  return {
    id: deterministicUuid(ENTITY_CODES.user, seq),
    email: `user-${seq}@example.com`,
    full_name: `Test User ${seq}`,
    avatar_url: null,
    role: "student",
    locale: "en",
    created_at: FACTORY_TIMESTAMP,
    updated_at: FACTORY_TIMESTAMP,
    ...overrides,
  }
}
