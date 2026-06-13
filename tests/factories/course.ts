import type { Database } from "@/lib/supabase/database.types"
import {
  deterministicUuid,
  ENTITY_CODES,
  FACTORY_TIMESTAMP,
  nextSequence,
} from "./sequence"

/**
 * Row type for the `courses` table, sourced from the generated Supabase types.
 * Use this instead of a local interface so the factory stays in sync with the
 * real schema.
 */
export type CourseFactoryRecord = Database["public"]["Tables"]["courses"]["Row"]

/**
 * Convenience aliases re-exported from the generated types so test files can
 * import these without reaching into database.types directly.
 */
export type CourseLevel = Database["public"]["Enums"]["course_level"]
export type CourseStatus = Database["public"]["Enums"]["course_status"]

/**
 * Builds a deterministic course record.
 *
 * Each call consumes one number from the shared factory sequence; identity
 * fields derive from that number and timestamps are fixed. Pass `overrides`
 * to pin any field - overrides always win over generated values.
 *
 * Note: `created_by` in the DB schema is `string | null`. The factory always
 * generates a deterministic UUID so the default value is never null, but the
 * type allows overriding to null for edge-case tests.
 */
export function buildCourse(
  overrides: Partial<CourseFactoryRecord> = {}
): CourseFactoryRecord {
  const seq = nextSequence()
  return {
    id: deterministicUuid(ENTITY_CODES.course, seq),
    slug: `course-${seq}`,
    title: `Course ${seq}`,
    description: `Deterministic description for course ${seq}.`,
    level: "beginner",
    cover_image_url: null,
    status: "published",
    language: "en",
    created_by: deterministicUuid(ENTITY_CODES.user, seq),
    created_at: FACTORY_TIMESTAMP,
    updated_at: FACTORY_TIMESTAMP,
    ...overrides,
  }
}
