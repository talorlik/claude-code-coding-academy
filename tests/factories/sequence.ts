/**
 * Deterministic sequence shared by all test data factories.
 *
 * Factories must be reproducible: no Math.random, no Date.now. Identity
 * derives from a module-level counter and a fixed timestamp, so two test
 * runs (or two builds within one run) always produce the same records in
 * the same order.
 */

/**
 * Fixed ISO-8601 timestamp used for every created_at/updated_at field so
 * factory output never depends on the wall clock.
 */
export const FACTORY_TIMESTAMP = "2026-01-01T00:00:00.000Z"

/**
 * Per-table codes embedded in the first segment of deterministic uuids so a
 * user id can never collide with a course or lesson id even when both were
 * built from the same sequence number.
 */
export const ENTITY_CODES = {
  user: 1,
  course: 2,
  lesson: 3,
} as const

let sequence = 0

/**
 * Returns the next number in the shared factory sequence (1-based).
 *
 * All factories draw from this single counter, so two sequential builds of
 * any entity type are guaranteed distinct identities.
 */
export function nextSequence(): number {
  sequence += 1
  return sequence
}

/**
 * Resets the shared sequence to its initial state.
 *
 * Call from beforeEach so every test starts from sequence 1 and factory
 * output is reproducible regardless of test execution order.
 */
export function resetFactorySequence(): void {
  sequence = 0
}

/**
 * Builds a deterministic UUID-shaped string for a factory record.
 *
 * The entity code fills the first segment and the sequence number the last,
 * producing valid-format, human-debuggable ids such as
 * `00000002-0000-4000-8000-000000000005` (course built from sequence 5).
 */
export function deterministicUuid(entityCode: number, seq: number): string {
  const entity = String(entityCode).padStart(8, "0")
  const tail = String(seq).padStart(12, "0")
  return `${entity}-0000-4000-8000-${tail}`
}
