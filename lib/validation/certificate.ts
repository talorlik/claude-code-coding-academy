import { z } from "zod"

/**
 * Schema for requesting certificate generation or verification.
 *
 * Both `userId` and `courseId` are required. The server action checks that
 * the user has completed the course before issuing a certificate.
 */
export const certificateSchema = z.object({
  // `.guid()` not `.string().uuid()`: Zod 4's `.uuid()` enforces RFC 9562
  // version/variant nibbles and rejects the repeated-character placeholder
  // course IDs the seed data uses. Postgres stores those as valid `uuid`, so the
  // column type is the contract. `.guid()` accepts any 8-4-4-4-12 hex string.
  // `userId` is a real RFC UUID from Supabase auth; kept on `.guid()` for
  // consistency and to avoid the same class of bug if a fixture uses a placeholder.
  userId: z.guid("User ID must be a valid UUID"),
  courseId: z.guid("Course ID must be a valid UUID"),
})

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

/** Input type inferred from {@link certificateSchema}. */
export type CertificateInput = z.infer<typeof certificateSchema>
