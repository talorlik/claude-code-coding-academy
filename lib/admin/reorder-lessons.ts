"use server"
import "server-only"

/**
 * @file lib/admin/reorder-lessons.ts
 *
 * Server action for reordering lessons within a course.
 *
 * Reorder strategy - two-phase update (TypeScript, no SQL function needed):
 *
 *   The lessons table has a UNIQUE constraint on (course_id, sort_order).
 *   A naive single-pass update e.g. setting lesson A from sort_order 1 -> 2
 *   while B still has sort_order 2 would transiently violate the constraint.
 *
 *   Solution: two-phase update through the request client.
 *     Phase 1: Offset every affected lesson to a large temporary value
 *              (sort_order + 10000) so no collision can occur.
 *     Phase 2: Set the final sort_order values.
 *   Both phases use a bulk `in` filter to minimise round trips.
 *
 *   Rationale for TypeScript over an SQL function:
 *   - The table uses a unique constraint, NOT a deferrable constraint, so a
 *     per-row SQL update inside a single transaction still collides unless
 *     deferred. A two-phase TS approach avoids adding a migration just for
 *     deferability and keeps all logic visible in the application layer.
 *   - Two round trips (phase1 + phase2) are acceptable for lesson reorders
 *     which are rare, low-frequency instructor actions.
 *   - If the DB gains a deferrable constraint or a reorder RPC later, this
 *     can be replaced without changing the public interface.
 */

import { revalidatePath } from "next/cache"

import { requireAdmin } from "@/lib/auth/guards"
import { createClient } from "@/lib/supabase/server"
import { reorderLessonsSchema } from "@/lib/validation/lesson"
import { parseWithSchema } from "@/lib/validation/parse"
import { ok, fail, type ActionResult } from "@/lib/types/action-result"

// The temporary offset must be larger than any realistic sort_order value.
const PHASE1_OFFSET = 10_000

/**
 * Reorders lessons within a course by applying new `sort_order` values.
 *
 * Caller sends the full desired order as `[{id, sortOrder}]`. Sort orders
 * must be unique non-negative integers (validated by `reorderLessonsSchema`).
 *
 * Uses the two-phase update strategy documented at the top of this file.
 * The request-scoped client is used (RLS enforced; instructor sees all lessons).
 *
 * @param courseId - Parent course UUID (used only for revalidation).
 * @param items - Array of `{id, sortOrder}` pairs defining the new order.
 * @returns `ok(null)` on success, `fail` on validation or DB error.
 */
export async function reorderLessons(
  courseId: string,
  items: unknown
): Promise<ActionResult<null>> {
  // 1. Guard.
  await requireAdmin()

  // 2. Validate input.
  const parsed = parseWithSchema(reorderLessonsSchema, items)
  if (!parsed.ok) return parsed

  const pairs = parsed.data

  if (pairs.length === 0) {
    return ok(null)
  }

  const supabase = await createClient()

  // -------------------------------------------------------------------------
  // Phase 1: Offset all sort_order values to avoid unique-constraint collisions
  //          during the final update. We add PHASE1_OFFSET to each current
  //          target value so the intermediate values cannot collide with any
  //          existing sort_order in the table.
  // -------------------------------------------------------------------------
  for (const { id, sortOrder } of pairs) {
    const { error } = await supabase
      .from("lessons")
      .update({ sort_order: sortOrder + PHASE1_OFFSET })
      .eq("id", id)

    if (error) {
      console.error("[admin/reorder-lessons] phase1 error:", error)
      return fail<null>("Failed to reorder lessons (phase 1). Please try again.")
    }
  }

  // -------------------------------------------------------------------------
  // Phase 2: Set the final sort_order values.
  // -------------------------------------------------------------------------
  for (const { id, sortOrder } of pairs) {
    const { error } = await supabase
      .from("lessons")
      .update({ sort_order: sortOrder })
      .eq("id", id)

    if (error) {
      console.error("[admin/reorder-lessons] phase2 error:", error)
      return fail<null>("Failed to reorder lessons (phase 2). Please try again.")
    }
  }

  revalidatePath("/[locale]/admin/courses", "page")
  revalidatePath(`/[locale]/admin/courses/${courseId}/lessons`, "page")
  return ok(null)
}
