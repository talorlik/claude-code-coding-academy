import type { ZodType, ZodError } from "zod"

import { fail, ok } from "@/lib/types/action-result"
import type { ActionResult } from "@/lib/types/action-result"

/**
 * Runs a Zod schema against `input` and maps the result to an
 * {@link ActionResult}.
 *
 * On success: returns `ok(parsedData)` with the coerced, validated value.
 *
 * On failure: returns `fail(message, fieldErrors)` where `fieldErrors` is
 * keyed by field name and each value is the first validation message for that
 * field. The top-level `message` is a generic "Validation failed" string
 * because callers are expected to render per-field messages from `fieldErrors`.
 *
 * This helper is intentionally thin - it does not know about forms, HTTP, or
 * React state. Any server action or route handler can call it and spread the
 * result to their own error-handling layer.
 *
 * @example
 * ```ts
 * const result = parseWithSchema(createCourseSchema, formData)
 * if (!result.ok) return result  // caller shows fieldErrors
 * await db.insertCourse(result.data)
 * ```
 */
export function parseWithSchema<T>(
  schema: ZodType<T>,
  input: unknown
): ActionResult<T> {
  const parsed = schema.safeParse(input)
  if (parsed.success) {
    return ok(parsed.data)
  }

  const fieldErrors = flattenFieldErrors(parsed.error)
  return fail<T>("Validation failed", fieldErrors)
}

/**
 * Flattens a `ZodError` into `Record<string, string>` by taking the first
 * message for each field. Zod v4 `flatten()` returns arrays per field;
 * `ActionResult` uses a single string per field for simplicity.
 */
function flattenFieldErrors(error: ZodError): Record<string, string> {
  const flat = error.flatten()
  const result: Record<string, string> = {}

  for (const [field, messages] of Object.entries(flat.fieldErrors)) {
    if (Array.isArray(messages) && messages.length > 0) {
      result[field] = messages[0] as string
    }
  }

  // Surface root-level (non-field) errors under a "_root" key so callers
  // can display a general banner when the error is not field-specific.
  if (flat.formErrors.length > 0) {
    result["_root"] = flat.formErrors[0] as string
  }

  return result
}
