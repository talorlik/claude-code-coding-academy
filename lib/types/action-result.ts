/**
 * Discriminated result type for server actions. `ok` carries validated data;
 * `fail` carries a human-facing message and optional per-field errors keyed by
 * field name. The `ok` boolean is the discriminant so callers can narrow.
 */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; fieldErrors?: Record<string, string> }

/**
 * Builds a successful {@link ActionResult}.
 */
export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data }
}

/**
 * Builds a failed {@link ActionResult} with a message and optional field errors.
 */
export function fail<T>(
  message: string,
  fieldErrors?: Record<string, string>
): ActionResult<T> {
  return { ok: false, message, fieldErrors }
}
