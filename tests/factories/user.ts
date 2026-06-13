import {
  deterministicUuid,
  ENTITY_CODES,
  FACTORY_TIMESTAMP,
  nextSequence,
} from "./sequence"

/**
 * Application role mirroring the planned `user_role` Postgres enum
 * (docs/planning/TECHNICAL_REQUIREMENTS.md section 6.2).
 */
export type UserRole = "student" | "admin"

/**
 * UI locale per the planned `profiles.locale` column
 * (docs/planning/TECHNICAL_REQUIREMENTS.md section 6.3).
 */
export type UserLocale = "en" | "he"

/**
 * Row shape of the planned `profiles` table
 * (docs/planning/TECHNICAL_REQUIREMENTS.md section 6.3).
 *
 * Defined locally because domain types do not exist yet; batch 03
 * introduces the real database types, at which point this interface should
 * be replaced by (or asserted against) the generated row type.
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
