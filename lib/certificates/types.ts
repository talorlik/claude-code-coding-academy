import type { Database } from "@/lib/supabase/database.types"

type CertificateRow = Database["public"]["Tables"]["certificates"]["Row"]

/**
 * DTO for a course completion certificate.
 * Maps from the `certificates` table row.
 */
export interface CertificateDTO {
  /** UUID primary key. */
  id: string
  /** User who earned the certificate. */
  userId: string
  /** Course the certificate was awarded for. */
  courseId: string
  /** ISO timestamp when the certificate was issued. */
  issuedAt: string
  /** ISO timestamp of row creation. */
  createdAt: string
}

/**
 * Maps a raw `certificates` row to a {@link CertificateDTO}.
 * The `metadata` JSON blob is intentionally omitted from the DTO because its
 * schema is unstructured and callers that need it should access it directly.
 */
export function toCertificateDTO(row: CertificateRow): CertificateDTO {
  return {
    id: row.id,
    userId: row.user_id,
    courseId: row.course_id,
    issuedAt: row.issued_at,
    createdAt: row.created_at,
  }
}
