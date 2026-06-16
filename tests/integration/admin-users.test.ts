/**
 * Integration tests for lib/admin/users.ts (Batch 26).
 *
 * Mocks:
 * - @/lib/auth/guards (requireAdmin) - controls caller id + admin gate.
 * - @supabase/supabase-js (createClient) - a service-role client whose
 *   `.from()` chain and `.auth.admin.*` namespace are scripted per test.
 *
 * Tested invariants:
 * - Every exported function calls requireAdmin() first (a non-admin throws).
 * - listUsers is set-based: one listUsers call + bulk reads, no per-user loop.
 * - Self-protection: setUserRole/setUserDisabled/deleteUser refuse the caller's
 *   own account.
 * - Last-instructor guard: demoting/deleting the final instructor is refused.
 *
 * The Supabase admin client is fully mocked; no live auth or DB is touched.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

// The data layer builds a service-role client from these env vars before any
// mocked call runs, so they must be present (the values are unused - the
// @supabase/supabase-js createClient is fully mocked below).
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://localhost:54321"
process.env.SUPABASE_SECRET_KEY ??= "test-secret"

// ---------------------------------------------------------------------------
// Mock state - shared between the mock factory and the tests.
// ---------------------------------------------------------------------------

const CALLER_ID = "00000000-0000-0000-0000-000000000001"
const OTHER_ID = "00000000-0000-0000-0000-000000000002"

let mockIsAdmin = true

/** Rows returned by `.from("user_roles").select(...)` shapes. */
let mockRoleRows: Array<{ user_id: string; role: string }> = []
/** Count returned by the instructor head-count query. */
let mockInstructorCount = 2
/** Result of the maybeSingle role read for a specific user. */
let mockSingleRole: { role: string } | null = null
/** Upsert/insert error (null = success). */
let mockUpsertError: { message: string } | null = null
/** Role-delete error (null = success). */
let mockDeleteRoleError: { message: string } | null = null

/** auth.admin.* scripted results. */
let mockListUsersResult: {
  data: { users: Array<Record<string, unknown>> }
  error: { message: string } | null
} = { data: { users: [] }, error: null }
let mockGetUserResult: {
  data: { user: Record<string, unknown> | null }
  error: { message: string } | null
} = { data: { user: null }, error: null }
let mockInviteResult: {
  data: { user: { id: string } | null }
  error: { message: string } | null
} = { data: { user: null }, error: null }
let mockUpdateUserError: { message: string } | null = null
let mockDeleteUserError: { message: string } | null = null

/** Spies so tests can assert "no N+1" and call counts. */
const listUsersSpy = vi.fn()
const inSpy = vi.fn()

vi.mock("@/lib/auth/guards", () => ({
  requireAdmin: vi.fn().mockImplementation(() => {
    if (!mockIsAdmin) throw new Error("REDIRECT")
    return Promise.resolve(CALLER_ID)
  }),
}))

/**
 * Builds a chainable query-builder mock. Each terminal method resolves to the
 * scripted result; the builder is reused across `.select().in()`,
 * `.select().eq().maybeSingle()`, `.select({count,head}).eq()`, and `.upsert()`.
 */
function makeFrom(table: string) {
  const builder = {
    select: (_cols?: string, opts?: { count?: string; head?: boolean }) => {
      // Head-count form: .select(col, {count, head}).eq(...)
      if (opts?.head) {
        return {
          eq: (_col: string, _val: string) =>
            Promise.resolve({
              count:
                table === "user_roles"
                  ? mockInstructorCount
                  : mockEnrollmentCount,
              error: null,
            }),
        }
      }
      return {
        in: (_col: string, _ids: string[]) => {
          inSpy(table)
          if (table === "user_roles") {
            return Promise.resolve({ data: mockRoleRows, error: null })
          }
          if (table === "profiles") {
            return Promise.resolve({ data: mockProfileRows, error: null })
          }
          return Promise.resolve({ data: mockEnrollmentRows, error: null })
        },
        eq: (_col: string, _val: string) => ({
          maybeSingle: () =>
            Promise.resolve({ data: mockSingleRole, error: null }),
        }),
      }
    },
    upsert: (_row: unknown, _opts?: unknown) =>
      Promise.resolve({ error: mockUpsertError }),
    delete: () => ({
      eq: (_col: string, _val: string) =>
        Promise.resolve({ error: mockDeleteRoleError }),
    }),
    insert: (_row: unknown) => Promise.resolve({ error: mockUpsertError }),
  }
  return builder
}

let mockProfileRows: Array<{ user_id: string; full_name: string | null }> = []
let mockEnrollmentRows: Array<{ user_id: string }> = []
let mockEnrollmentCount = 0

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn().mockImplementation(() => ({
    from: (table: string) => makeFrom(table),
    auth: {
      admin: {
        listUsers: vi.fn().mockImplementation((args: unknown) => {
          listUsersSpy(args)
          return Promise.resolve(mockListUsersResult)
        }),
        getUserById: vi.fn().mockImplementation(() =>
          Promise.resolve(mockGetUserResult)
        ),
        inviteUserByEmail: vi.fn().mockImplementation(() =>
          Promise.resolve(mockInviteResult)
        ),
        updateUserById: vi.fn().mockImplementation(() =>
          Promise.resolve({ error: mockUpdateUserError })
        ),
        deleteUser: vi.fn().mockImplementation(() =>
          Promise.resolve({ error: mockDeleteUserError })
        ),
      },
    },
  })),
}))

// Import AFTER mocks so hoisting applies.
const {
  listUsers,
  getUser,
  setUserRole,
  inviteUser,
  setUserDisabled,
  deleteUser,
} = await import("@/lib/admin/users")

// ---------------------------------------------------------------------------
// Reset before each test.
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockIsAdmin = true
  mockRoleRows = []
  mockProfileRows = []
  mockEnrollmentRows = []
  mockEnrollmentCount = 0
  mockInstructorCount = 2
  mockSingleRole = null
  mockUpsertError = null
  mockDeleteRoleError = null
  mockListUsersResult = { data: { users: [] }, error: null }
  mockGetUserResult = { data: { user: null }, error: null }
  mockInviteResult = { data: { user: null }, error: null }
  mockUpdateUserError = null
  mockDeleteUserError = null
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// requireAdmin gate - every function.
// ---------------------------------------------------------------------------

describe("requireAdmin gate", () => {
  it("listUsers throws for a non-admin", async () => {
    mockIsAdmin = false
    await expect(listUsers()).rejects.toThrow("REDIRECT")
  })
  it("getUser throws for a non-admin", async () => {
    mockIsAdmin = false
    await expect(getUser(OTHER_ID)).rejects.toThrow("REDIRECT")
  })
  it("setUserRole throws for a non-admin", async () => {
    mockIsAdmin = false
    await expect(setUserRole(OTHER_ID, "student")).rejects.toThrow("REDIRECT")
  })
  it("inviteUser throws for a non-admin", async () => {
    mockIsAdmin = false
    await expect(inviteUser("x@example.com", "student")).rejects.toThrow(
      "REDIRECT"
    )
  })
  it("setUserDisabled throws for a non-admin", async () => {
    mockIsAdmin = false
    await expect(setUserDisabled(OTHER_ID, true)).rejects.toThrow("REDIRECT")
  })
  it("deleteUser throws for a non-admin", async () => {
    mockIsAdmin = false
    await expect(deleteUser(OTHER_ID)).rejects.toThrow("REDIRECT")
  })
})

// ---------------------------------------------------------------------------
// listUsers - set-based, merged.
// ---------------------------------------------------------------------------

describe("listUsers", () => {
  it("merges roles, names, enrollment counts; one listUsers call, no N+1", async () => {
    mockListUsersResult = {
      data: {
        users: [
          { id: OTHER_ID, email: "a@example.com", created_at: "2026-01-01" },
          { id: CALLER_ID, email: "b@example.com", created_at: "2026-01-02" },
        ],
      },
      error: null,
    }
    mockRoleRows = [{ user_id: CALLER_ID, role: "instructor" }]
    mockProfileRows = [{ user_id: OTHER_ID, full_name: "Aaron" }]
    mockEnrollmentRows = [{ user_id: OTHER_ID }, { user_id: OTHER_ID }]

    const result = await listUsers()
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(listUsersSpy).toHaveBeenCalledTimes(1)
    // Three bulk `.in()` reads (roles, profiles, enrollments), not per-user.
    expect(inSpy).toHaveBeenCalledTimes(3)

    const aaron = result.data.users.find((u) => u.id === OTHER_ID)!
    expect(aaron.fullName).toBe("Aaron")
    expect(aaron.role).toBe("student") // no role row -> default student
    expect(aaron.enrollmentCount).toBe(2)

    const self = result.data.users.find((u) => u.id === CALLER_ID)!
    expect(self.role).toBe("instructor")
    expect(self.enrollmentCount).toBe(0)
  })

  it("flags a banned user as disabled", async () => {
    const future = new Date(Date.now() + 1_000_000).toISOString()
    mockListUsersResult = {
      data: {
        users: [
          {
            id: OTHER_ID,
            email: "a@example.com",
            created_at: "2026-01-01",
            banned_until: future,
          },
        ],
      },
      error: null,
    }
    const result = await listUsers()
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.data.users[0].disabled).toBe(true)
  })

  it("returns fail when listUsers errors", async () => {
    mockListUsersResult = { data: { users: [] }, error: { message: "boom" } }
    const result = await listUsers()
    expect(result.ok).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// getUser
// ---------------------------------------------------------------------------

describe("getUser", () => {
  it("returns userNotFound when the auth user is missing", async () => {
    mockGetUserResult = { data: { user: null }, error: null }
    const result = await getUser(OTHER_ID)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toBe("userNotFound")
  })

  it("returns detail with role and enrollment count", async () => {
    mockGetUserResult = {
      data: {
        user: { id: OTHER_ID, email: "a@example.com", created_at: "2026-01-01" },
      },
      error: null,
    }
    mockProfileRows = []
    mockEnrollmentCount = 3
    mockSingleRole = { role: "instructor" }

    const result = await getUser(OTHER_ID)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.role).toBe("instructor")
      expect(result.data.enrollmentCount).toBe(3)
    }
  })
})

// ---------------------------------------------------------------------------
// setUserRole - self-protection + last-instructor.
// ---------------------------------------------------------------------------

describe("setUserRole", () => {
  it("refuses to demote the caller's own account (cannotSelf)", async () => {
    const result = await setUserRole(CALLER_ID, "student")
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toBe("cannotSelf")
  })

  it("refuses to demote the last instructor (lastInstructor)", async () => {
    mockSingleRole = { role: "instructor" } // target currently instructor
    mockInstructorCount = 1
    const result = await setUserRole(OTHER_ID, "student")
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toBe("lastInstructor")
  })

  it("allows demoting when other instructors remain", async () => {
    mockSingleRole = { role: "instructor" }
    mockInstructorCount = 2
    const result = await setUserRole(OTHER_ID, "student")
    expect(result.ok).toBe(true)
  })

  it("allows promoting a student to instructor", async () => {
    const result = await setUserRole(OTHER_ID, "instructor")
    expect(result.ok).toBe(true)
  })

  it("returns roleChangeFailed on a DB error", async () => {
    mockUpsertError = { message: "db" }
    const result = await setUserRole(OTHER_ID, "instructor")
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toBe("roleChangeFailed")
  })
})

// ---------------------------------------------------------------------------
// inviteUser
// ---------------------------------------------------------------------------

describe("inviteUser", () => {
  it("returns ok and assigns the role on a successful invite", async () => {
    mockInviteResult = { data: { user: { id: OTHER_ID } }, error: null }
    const result = await inviteUser("new@example.com", "student")
    expect(result.ok).toBe(true)
  })

  it("returns inviteFailed when the invite errors", async () => {
    mockInviteResult = { data: { user: null }, error: { message: "x" } }
    const result = await inviteUser("new@example.com", "student")
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toBe("inviteFailed")
  })
})

// ---------------------------------------------------------------------------
// setUserDisabled - self-protection.
// ---------------------------------------------------------------------------

describe("setUserDisabled", () => {
  it("refuses to disable the caller's own account (cannotSelf)", async () => {
    const result = await setUserDisabled(CALLER_ID, true)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toBe("cannotSelf")
  })

  it("allows disabling another user", async () => {
    const result = await setUserDisabled(OTHER_ID, true)
    expect(result.ok).toBe(true)
  })

  it("allows reactivating the caller's own account (enable is not self-harm)", async () => {
    const result = await setUserDisabled(CALLER_ID, false)
    expect(result.ok).toBe(true)
  })

  it("returns disableFailed on an auth error", async () => {
    mockUpdateUserError = { message: "x" }
    const result = await setUserDisabled(OTHER_ID, true)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toBe("disableFailed")
  })
})

// ---------------------------------------------------------------------------
// deleteUser - self-protection + last-instructor.
// ---------------------------------------------------------------------------

describe("deleteUser", () => {
  it("refuses to delete the caller's own account (cannotSelf)", async () => {
    const result = await deleteUser(CALLER_ID)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toBe("cannotSelf")
  })

  it("refuses to delete the last instructor (lastInstructor)", async () => {
    mockSingleRole = { role: "instructor" }
    mockInstructorCount = 1
    const result = await deleteUser(OTHER_ID)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toBe("lastInstructor")
  })

  it("allows deleting a student", async () => {
    mockSingleRole = { role: "student" }
    const result = await deleteUser(OTHER_ID)
    expect(result.ok).toBe(true)
  })

  it("returns deleteFailed on an auth error", async () => {
    mockSingleRole = { role: "student" }
    mockDeleteUserError = { message: "x" }
    const result = await deleteUser(OTHER_ID)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toBe("deleteFailed")
  })
})
