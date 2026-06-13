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
  groupId: z.string().uuid("Group ID must be a valid UUID"),
  userId: z.string().uuid("User ID must be a valid UUID"),
})

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

/** Input type inferred from {@link createGroupSchema}. */
export type CreateGroupInput = z.infer<typeof createGroupSchema>

/** Input type inferred from {@link groupMembershipSchema}. */
export type GroupMembershipInput = z.infer<typeof groupMembershipSchema>
