import { z } from "zod"

/**
 * Schema for full-text search queries.
 *
 * The query is trimmed before validation so a blank string after trimming
 * fails the min-length check. Max length prevents runaway payloads and
 * mirrors typical Postgres `to_tsquery` practical limits.
 */
export const searchQuerySchema = z.object({
  q: z
    .string()
    .min(1, "Search query is required")
    .max(200, "Search query must be 200 characters or fewer")
    .transform((v) => v.trim())
    .refine((v) => v.length > 0, "Search query cannot be blank"),
})

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

/** Input type inferred from {@link searchQuerySchema}. */
export type SearchQueryInput = z.infer<typeof searchQuerySchema>
