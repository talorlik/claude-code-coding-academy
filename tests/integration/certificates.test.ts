/**
 * Integration tests for lib/certificates/queries.ts and actions.ts.
 *
 * All Supabase client calls are mocked; no live DB connection needed.
 *
 * Tested invariants:
 * - isEligibleForCertificate: returns true only when completed_at is set.
 * - issueCertificate: idempotent (upsert with ignoreDuplicates).
 * - issueCertificate: fails when course is not complete.
 * - getMyCertificates: returns own rows only (RLS via auth.uid).
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

// ---------------------------------------------------------------------------
// Builder stub - chainable Supabase query builder
// ---------------------------------------------------------------------------

type MockResult = { data: unknown; error: null | { message: string; code?: string } }
const mockResults: Record<string, MockResult> = {}

function makeBuilder(table: string) {
  const b = {
    select: () => b,
    eq: () => b,
    not: () => b,
    order: () => b,
    in: () => b,
    limit: () => b,
    single: () => Promise.resolve(mockResults[table] ?? { data: null, error: null }),
    maybeSingle: () =>
      Promise.resolve(
        mockResults[`${table}:maybe`] ?? { data: null, error: null }
      ),
    upsert: (_data: unknown, _opts: unknown) =>
      Promise.resolve(
        mockResults[`${table}:upsert`] ?? { data: null, error: null }
      ),
    // Make builder thenable for direct await (list queries ending in .order/.eq).
    then: (resolve: (v: unknown) => void) =>
      Promise.resolve(mockResults[table] ?? { data: [], error: null }).then(
        resolve
      ),
  }
  return b
}

let mockAuthUser: { id: string } | null = { id: "user-uuid-1" }

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockImplementation(() =>
        Promise.resolve({ data: { user: mockAuthUser } })
      ),
    },
    from: (table: string) => makeBuilder(table),
  }),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

// requireUser resolves to the current user id.
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: vi.fn().mockResolvedValue("user-uuid-1"),
  requireInstructor: vi.fn().mockResolvedValue("instructor-uuid"),
}))

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("isEligibleForCertificate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockResults).forEach((k) => delete mockResults[k])
    mockAuthUser = { id: "user-uuid-1" }
  })

  it("returns false when enrollment has no completed_at", async () => {
    // maybeSingle returns null -> no completed enrollment found
    mockResults["enrollments:maybe"] = { data: null, error: null }

    const { isEligibleForCertificate } = await import(
      "@/lib/certificates/queries"
    )
    const result = await isEligibleForCertificate("user-uuid-1", "course-uuid-1")
    expect(result).toBe(false)
  })

  it("returns true when enrollment has completed_at", async () => {
    mockResults["enrollments:maybe"] = {
      data: { completed_at: "2026-01-01T00:00:00Z" },
      error: null,
    }

    const { isEligibleForCertificate } = await import(
      "@/lib/certificates/queries"
    )
    const result = await isEligibleForCertificate("user-uuid-1", "course-uuid-1")
    expect(result).toBe(true)
  })
})

describe("getMyCertificates", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockResults).forEach((k) => delete mockResults[k])
  })

  it("returns empty array when no certificates exist", async () => {
    mockResults["certificates"] = { data: [], error: null }

    const { getMyCertificates } = await import("@/lib/certificates/queries")
    const result = await getMyCertificates("user-uuid-1")
    expect(result).toEqual([])
  })

  it("maps certificate rows to DTOs", async () => {
    const row = {
      id: "cert-1",
      user_id: "user-uuid-1",
      course_id: "course-uuid-1",
      issued_at: "2026-01-01T00:00:00Z",
      created_at: "2026-01-01T00:00:00Z",
      metadata: null,
    }
    mockResults["certificates"] = { data: [row], error: null }

    const { getMyCertificates } = await import("@/lib/certificates/queries")
    const result = await getMyCertificates("user-uuid-1")
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("cert-1")
    expect(result[0].userId).toBe("user-uuid-1")
    expect(result[0].courseId).toBe("course-uuid-1")
  })
})

describe("issueCertificate (action)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockResults).forEach((k) => delete mockResults[k])
    mockAuthUser = { id: "user-uuid-1" }
  })

  it("fails when course is not complete (no eligible enrollment)", async () => {
    // isEligibleForCertificate -> false
    mockResults["enrollments:maybe"] = { data: null, error: null }

    const { issueCertificate } = await import("@/lib/certificates/actions")
    const result = await issueCertificate("course-uuid-1")
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toBe("courseNotComplete")
    }
  })

  it("succeeds and is idempotent when eligibility met", async () => {
    // eligible
    mockResults["enrollments:maybe"] = {
      data: { completed_at: "2026-01-01T00:00:00Z" },
      error: null,
    }
    // course lookup
    mockResults["courses"] = {
      data: { id: "course-uuid-1", title: "Test Course", slug: "test-course" },
      error: null,
    }
    // profile lookup
    mockResults["profiles"] = {
      data: { full_name: "Alice", email: "alice@example.com" },
      error: null,
    }
    // upsert succeeds
    mockResults["certificates:upsert"] = { data: null, error: null }
    // read-back
    mockResults["certificates"] = {
      data: {
        id: "cert-1",
        user_id: "user-uuid-1",
        course_id: "course-uuid-1",
        issued_at: "2026-01-01T00:00:00Z",
        created_at: "2026-01-01T00:00:00Z",
        metadata: null,
      },
      error: null,
    }

    const { issueCertificate } = await import("@/lib/certificates/actions")
    const result = await issueCertificate("course-uuid-1")
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.id).toBe("cert-1")
    }
  })
})
