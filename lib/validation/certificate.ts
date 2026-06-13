import { z } from "zod"

/**
 * Schema for requesting certificate generation or verification.
 *
 * Both `userId` and `courseId` are required. The server action checks that
 * the user has completed the course before issuing a certificate.
 */
export const certificateSchema = z.object({
  userId: z.string().uuid("User ID must be a valid UUID"),
  courseId: z.string().uuid("Course ID must be a valid UUID"),
})

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

/** Input type inferred from {@link certificateSchema}. */
export type CertificateInput = z.infer<typeof certificateSchema>
