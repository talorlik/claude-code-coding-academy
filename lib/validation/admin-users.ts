import { z } from "zod"

/**
 * Server-side validation schemas for the admin user-management area (Batch 26).
 *
 * These are the authoritative checks behind the service-role data layer. The
 * admin forms are Tier-2 no-JS `<form>`s, so HTML attributes (`required`,
 * `type="email"`) are a progressive-enhancement nicety only; a client can strip
 * them. Every constraint is re-enforced here before a privileged, RLS-bypassing
 * mutation runs.
 */

/**
 * The two application roles. Mirrors the `app_role` enum in the database
 * (`'instructor' | 'student'`); "admin" in the UI maps to the instructor role.
 */
export const ROLE_VALUES = ["instructor", "student"] as const

/** A validated application role. */
export type RoleValue = (typeof ROLE_VALUES)[number]

/**
 * Invite schema: the email a new user is invited at, plus the role to assign on
 * acceptance. The address is trimmed and lower-cased so the stored value is
 * normalized and the invite is idempotent against case variants.
 */
export const inviteSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email is required.")
    .max(254, "Email is too long.")
    .email("Enter a valid email address."),
  role: z.enum(ROLE_VALUES),
})

/** Validated invite input. */
export type InviteInput = z.infer<typeof inviteSchema>

/**
 * Role-change schema. `userId` is the target user's auth id (a UUID); `role` is
 * the role to set. Validated before the data layer applies its self-protection
 * and last-instructor guards.
 */
export const roleChangeSchema = z.object({
  // `.guid()` not `.string().uuid()`: Zod 4's `.uuid()` enforces RFC 9562
  // version/variant nibbles and would reject the repeated-character placeholder
  // IDs the seed data uses. These `userId`s are real RFC UUIDs from Supabase auth,
  // but `.guid()` (any 8-4-4-4-12 hex string) is used for consistency with the
  // other validators and to avoid the same class of bug if a fixture uses one.
  userId: z.guid("Invalid user id."),
  role: z.enum(ROLE_VALUES),
})

/** Validated role-change input. */
export type RoleChangeInput = z.infer<typeof roleChangeSchema>

/**
 * Disable-toggle schema. `disabled` is the desired account state: `true` bans
 * the account (sign-in blocked), `false` lifts the ban (reactivates). The toggle
 * is reversible and never deletes data.
 */
export const disableSchema = z.object({
  // See `roleChangeSchema` above for why `.guid()` rather than `.string().uuid()`.
  userId: z.guid("Invalid user id."),
  disabled: z.boolean(),
})

/** Validated disable-toggle input. */
export type DisableInput = z.infer<typeof disableSchema>

/**
 * Delete schema. `userId` is the target user's auth id. Deletion cascades to all
 * FK-referencing rows (enrollments, lesson_progress, user_roles, profiles).
 */
export const deleteSchema = z.object({
  // See `roleChangeSchema` above for why `.guid()` rather than `.string().uuid()`.
  userId: z.guid("Invalid user id."),
})

/** Validated delete input. */
export type DeleteInput = z.infer<typeof deleteSchema>
