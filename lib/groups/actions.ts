"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth/guards"
import { fail, ok } from "@/lib/types/action-result"
import type { ActionResult } from "@/lib/types/action-result"
import { toClassGroupDTO, toClassGroupMemberDTO } from "@/lib/groups/types"
import type { ClassGroupDTO, ClassGroupMemberDTO } from "@/lib/groups/types"
import { createGroupSchema, groupMembershipSchema } from "@/lib/validation/group"
import { parseWithSchema } from "@/lib/validation/parse"

// ---------------------------------------------------------------------------
// createGroup
// ---------------------------------------------------------------------------

/**
 * Server action: create a new class group.
 *
 * Guards: requireAdmin() - instructor role required.
 * Idempotency: the unique(slug) constraint is handled by catching the 23505
 * Postgres error code and returning a typed fieldError.
 *
 * @param input - Object with `slug` and `name`.
 * @returns `ok(ClassGroupDTO)` on success or `fail(message)` on error.
 */
export async function createGroup(
  input: unknown
): Promise<ActionResult<ClassGroupDTO>> {
  const adminId = await requireAdmin()
  const supabase = await createClient()

  const parsed = parseWithSchema(createGroupSchema, input)
  if (!parsed.ok) {
    return fail<ClassGroupDTO>(parsed.message, parsed.fieldErrors)
  }

  const { slug, name } = parsed.data

  const { data, error } = await supabase
    .from("class_groups")
    .insert({ slug, name, created_by: adminId })
    .select("id, slug, name, created_by, created_at, updated_at")
    .single()

  if (error) {
    // 23505 = unique_violation (slug already taken)
    if (error.code === "23505") {
      return fail<ClassGroupDTO>("Slug already taken.", {
        slug: "A group with this slug already exists.",
      })
    }
    console.error("[groups/actions] createGroup:", error)
    return fail<ClassGroupDTO>("Failed to create group. Please try again.")
  }

  revalidatePath("/", "layout")

  return ok<ClassGroupDTO>(toClassGroupDTO(data))
}

// ---------------------------------------------------------------------------
// addMember
// ---------------------------------------------------------------------------

/**
 * Server action: add a user to a class group.
 *
 * Guards: requireAdmin() - instructor role required.
 * Idempotent: duplicate membership rows are silently ignored via ignoreDuplicates.
 *
 * @param input - Object with `groupId` and `userId`.
 * @returns `ok(ClassGroupMemberDTO)` on success or `fail(message)` on error.
 */
export async function addMember(
  input: unknown
): Promise<ActionResult<ClassGroupMemberDTO>> {
  await requireAdmin()
  const supabase = await createClient()

  const parsed = parseWithSchema(groupMembershipSchema, input)
  if (!parsed.ok) {
    return fail<ClassGroupMemberDTO>(parsed.message, parsed.fieldErrors)
  }

  const { groupId, userId } = parsed.data

  // Verify the group exists.
  const { data: group, error: groupError } = await supabase
    .from("class_groups")
    .select("id")
    .eq("id", groupId)
    .maybeSingle()

  if (groupError || !group) {
    return fail<ClassGroupMemberDTO>("Group not found.")
  }

  // Upsert with ignoreDuplicates - the table has a unique(group_id, user_id)
  // constraint (enforced via RLS unique policy in batch 02).
  const { error: insertError } = await supabase
    .from("class_group_members")
    .upsert({ group_id: groupId, user_id: userId }, { ignoreDuplicates: true })

  if (insertError) {
    console.error("[groups/actions] addMember insert:", insertError)
    return fail<ClassGroupMemberDTO>("Failed to add member. Please try again.")
  }

  // Read back the member row.
  const { data: member, error: fetchError } = await supabase
    .from("class_group_members")
    .select("id, group_id, user_id, created_at")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .single()

  if (fetchError || !member) {
    return fail<ClassGroupMemberDTO>("Member added but could not retrieve record.")
  }

  revalidatePath("/", "layout")

  return ok<ClassGroupMemberDTO>(toClassGroupMemberDTO(member))
}

// ---------------------------------------------------------------------------
// removeMember
// ---------------------------------------------------------------------------

/**
 * Server action: remove a user from a class group.
 *
 * Guards: requireAdmin() - instructor role required.
 *
 * @param input - Object with `groupId` and `userId`.
 * @returns `ok(true)` on success or `fail(message)` on error.
 */
export async function removeMember(
  input: unknown
): Promise<ActionResult<boolean>> {
  await requireAdmin()
  const supabase = await createClient()

  const parsed = parseWithSchema(groupMembershipSchema, input)
  if (!parsed.ok) {
    return fail<boolean>(parsed.message, parsed.fieldErrors)
  }

  const { groupId, userId } = parsed.data

  const { error } = await supabase
    .from("class_group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId)

  if (error) {
    console.error("[groups/actions] removeMember:", error)
    return fail<boolean>("Failed to remove member. Please try again.")
  }

  revalidatePath("/", "layout")

  return ok<boolean>(true)
}
