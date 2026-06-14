import { z } from "zod"

/**
 * Validation schema for the `/courses` catalog query params.
 *
 * Every field is forgiving: an absent, blank, or malformed value coerces to a
 * sensible default via `.catch()` rather than erroring, because these come from
 * a shareable, hand-editable URL (`?q=&category=&sort=&mine=1`). The page must
 * always render, never 400 on a junk query string.
 *
 * - `q` - trimmed search term; blank becomes undefined (no filter).
 * - `category` - a category slug to filter by; blank becomes undefined.
 * - `sort` - one of the catalog sorts; anything else falls back to "popular".
 * - `mine` - the "My Courses" toggle; truthy when the raw value is "1" or
 *   "true". Anything else is false.
 */
export const catalogQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .max(200)
    .transform((v) => (v.length === 0 ? undefined : v))
    .optional()
    .catch(undefined),
  category: z
    .string()
    .trim()
    .max(100)
    .transform((v) => (v.length === 0 ? undefined : v))
    .optional()
    .catch(undefined),
  sort: z.enum(["popular", "rated", "newest"]).catch("popular"),
  mine: z
    .union([z.string(), z.boolean()])
    .transform((v) => v === true || v === "1" || v === "true")
    .catch(false),
})

/** Parsed, normalized catalog query params. */
export type CatalogQuery = z.infer<typeof catalogQuerySchema>
