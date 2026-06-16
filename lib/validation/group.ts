import { z } from "zod"

/**
 * Schema for creating a new class group.
 */
export const createGroupSchema = z.object({
  slug: z
    .string()
    .min(1, "Slug is required")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug may only contain lowercase letters, digits, and hyphens"
    ),
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be 255 characters or fewer"),
})

/**
 * Schema for adding or removing a user from a group (membership management).
 */
export const groupMembershipSchema = z.object({
  // `.guid()` not `.string().uuid()`: Zod 4's `.uuid()` enforces RFC 9562
  // version/variant nibbles and rejects the repeated-character placeholder IDs
  // the seed data uses. Postgres stores those as valid `uuid`, so the column type
  // is the contract. `.guid()` accepts any 8-4-4-4-12 hex string. `userId` is a
  // real RFC UUID from Supabase auth; kept on `.guid()` for consistency.
  groupId: z.guid("Group ID must be a valid UUID"),
  userId: z.guid("User ID must be a valid UUID"),
})

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

/** Input type inferred from {@link createGroupSchema}. */
export type CreateGroupInput = z.infer<typeof createGroupSchema>

/** Input type inferred from {@link groupMembershipSchema}. */
export type GroupMembershipInput = z.infer<typeof groupMembershipSchema>
