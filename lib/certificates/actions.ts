"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { requireUser } from "@/lib/auth/require-user"
import { fail, ok } from "@/lib/types/action-result"
import type { ActionResult } from "@/lib/types/action-result"
import { toCertificateDTO } from "@/lib/certificates/types"
import type { CertificateDTO } from "@/lib/certificates/types"
import { isEligibleForCertificate } from "@/lib/certificates/queries"

// ---------------------------------------------------------------------------
// issueCertificate
// ---------------------------------------------------------------------------

/**
 * Server action: issue a completion certificate for the authenticated user.
 *
 * Guards:
 * - requireUser() - must be authenticated.
 * - isEligibleForCertificate() - enrollment must have completed_at set.
 *
 * Idempotent: the unique(user_id, course_id) constraint on the certificates
 * table means a duplicate insert returns the existing row silently. The
 * on-conflict path reads back the row so the caller always gets the DTO.
 *
 * Metadata stored in the JSONB field holds safe display fields (course title,
 * student full_name from profile) so the printable page can render without
 * extra round-trips.
 *
 * @param courseId - UUID of the course to issue the certificate for.
 * @returns `ok(CertificateDTO)` on success or `fail(message)` on error.
 */
export async function issueCertificate(
  courseId: string
): Promise<ActionResult<CertificateDTO>> {
  const userId = await requireUser()
  const supabase = await createClient()

  // 1. Verify eligibility.
  const eligible = await isEligibleForCertificate(userId, courseId)
  if (!eligible) {
    return fail<CertificateDTO>("courseNotComplete")
  }

  // 2. Fetch metadata for the certificate (course title + student name).
  const [{ data: course }, { data: profile }] = await Promise.all([
    supabase
      .from("courses")
      .select("id, title, slug")
      .eq("id", courseId)
      .single(),
    supabase
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", userId)
      .single(),
  ])

  if (!course) {
    return fail<CertificateDTO>("courseNotFound")
  }

  const metadata = {
    courseTitle: course.title,
    courseSlug: course.slug,
    studentName: profile?.full_name ?? profile?.email ?? null,
    issuedDate: new Date().toISOString().slice(0, 10),
    academyName: "Eyal's Coding Academy",
  }

  // 3. Insert idempotently - unique(user_id, course_id) constraint.
  //    ignoreDuplicates means a second call silently returns without error
  //    (the row stays unchanged). We then read back the existing row.
  const { error: insertError } = await supabase.from("certificates").upsert(
    {
      user_id: userId,
      course_id: courseId,
      metadata,
    },
    { onConflict: "user_id,course_id", ignoreDuplicates: true }
  )

  if (insertError) {
    console.error("[certificates/actions] issueCertificate insert:", insertError)
    return fail<CertificateDTO>("Failed to issue certificate. Please try again.")
  }

  // 4. Read back the certificate row (covers both insert + idempotent paths).
  const { data: cert, error: fetchError } = await supabase
    .from("certificates")
    .select("id, user_id, course_id, issued_at, created_at, metadata")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .single()

  if (fetchError || !cert) {
    console.error("[certificates/actions] issueCertificate read-back:", fetchError)
    return fail<CertificateDTO>("Failed to retrieve certificate.")
  }

  revalidatePath("/", "layout")

  return ok<CertificateDTO>(toCertificateDTO(cert))
}
