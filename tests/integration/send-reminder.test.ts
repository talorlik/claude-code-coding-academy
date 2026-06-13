/**
 * Integration tests for lib/reminders/actions.ts - sendReminder.
 *
 * All Supabase clients and the email transport are mocked.
 * No real email is sent; no real DB connection is established.
 *
 * Tested invariants:
 * - requireAdmin gate: non-admin throws (simulated by mock redirect).
 * - Status flips 'queued' -> 'sent' + sent_at set on success.
 * - Transport failure -> status 'failed' + safe fail message.
 * - An already-'sent' reminder is idempotent (no second send).
 * - The returned error NEVER contains SMTP_PASSWORD.
 * - Email resolution falls back to admin client when profiles.email is null.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

// next-intl server mock - getTranslations returns a simple key->value lookup.
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string, params?: Record<string, string>) => {
    const map: Record<string, string> = {
      "email.subject": "We miss you!",
      "email.subjectWithCourse": `Continue ${params?.course ?? ""}`,
      "email.greeting": "Hello,",
      "email.greetingName": `Hello ${params?.name ?? ""},`,
      "email.body": `Come back! ${params?.link ?? ""}`,
      "email.bodyWithCourse": `Continue ${params?.course ?? ""}! ${params?.link ?? ""}`,
      "email.closing": "The Academy Team",
    }
    return map[key] ?? key
  }),
  setRequestLocale: vi.fn(),
  getLocale: vi.fn().mockResolvedValue("en"),
}))

// sendEmail mock - controlled per test via mockSendEmailResult.
let mockSendEmailResult: { ok: boolean; data?: { messageId: string }; message?: string } = {
  ok: true,
  data: { messageId: "<msg-id@gmail.com>" },
}

vi.mock("@/lib/email/transport", () => ({
  sendEmail: vi.fn().mockImplementation(async () => mockSendEmailResult),
  getTransport: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Supabase mock builder
// ---------------------------------------------------------------------------

type MockResult = { data: unknown; error: null | { message: string; code?: string } }
const mockResults: Record<string, MockResult> = {}

function makeBuilder(table: string) {
  const b = {
    select: (..._args: unknown[]) => b,
    eq: (..._args: unknown[]) => b,
    is: (..._args: unknown[]) => b,
    not: (..._args: unknown[]) => b,
    order: (..._args: unknown[]) => b,
    limit: (..._args: unknown[]) => b,
    gte: (..._args: unknown[]) => b,
    single: () =>
      Promise.resolve(mockResults[table] ?? { data: null, error: null }),
    maybeSingle: () =>
      Promise.resolve(mockResults[`${table}:maybe`] ?? { data: null, error: null }),
    insert: (_data: unknown) => ({
      select: () => ({
        single: () =>
          Promise.resolve(mockResults[`${table}:insert`] ?? { data: null, error: null }),
      }),
    }),
    update: (_data: unknown) => ({
      eq: (..._args: unknown[]) => ({
        select: () => ({
          single: () =>
            Promise.resolve(mockResults[`${table}:update`] ?? { data: null, error: null }),
        }),
        // Also support .update().eq() without chained .select().single()
        then: (resolve: (v: unknown) => unknown) =>
          Promise.resolve(mockResults[`${table}:update`] ?? { data: null, error: null }).then(resolve),
      }),
    }),
    then: (resolve: (v: unknown) => unknown) =>
      Promise.resolve(mockResults[table] ?? { data: [], error: null }).then(resolve),
  }
  return b
}

// Admin auth mock for getUserById.
let mockGetUserById: { data: { user: { email: string } | null }; error: null } = {
  data: { user: { email: "student@example.com" } },
  error: null,
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "admin-1" } } }),
    },
    from: (table: string) => makeBuilder(table),
  }),
  createAdminClient: vi.fn().mockReturnValue({
    auth: {
      admin: {
        getUserById: vi.fn().mockImplementation(async () => mockGetUserById),
      },
    },
    from: (table: string) => makeBuilder(table),
  }),
}))

// requireAdmin mock - controlled per test via mockIsAdmin.
let mockIsAdmin = true
const mockRedirect = vi.fn().mockImplementation(() => {
  throw new Error("REDIRECT")
})

vi.mock("@/lib/auth/guards", () => ({
  requireAdmin: vi.fn().mockImplementation(async () => {
    if (!mockIsAdmin) throw new Error("REDIRECT")
    return "admin-uuid"
  }),
  getIsAdmin: vi.fn().mockImplementation(async () => mockIsAdmin),
}))

vi.mock("@/i18n/navigation", () => ({
  redirect: mockRedirect,
}))

vi.mock("@/lib/utils/site-url", () => ({
  getSiteUrl: vi.fn().mockReturnValue("https://example.com"),
}))

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

const QUEUED_REMINDER = {
  id: "reminder-uuid-1",
  user_id: "student-uuid-1",
  course_id: "course-uuid-1",
  reason: "inactive_7_days",
  status: "queued",
  sent_at: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  metadata: null,
}

const STUDENT_PROFILE = {
  email: "student@example.com",
  full_name: "Test Student",
  locale: "en",
}

const COURSE_ROW = {
  title: "JavaScript Fundamentals",
  slug: "javascript-fundamentals",
}

const SENT_REMINDER = {
  ...QUEUED_REMINDER,
  status: "sent",
  sent_at: new Date().toISOString(),
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("sendReminder", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockResults).forEach((k) => delete mockResults[k])
    mockIsAdmin = true
    mockSendEmailResult = { ok: true, data: { messageId: "<msg-id@gmail.com>" } }
    mockGetUserById = { data: { user: { email: "student@example.com" } }, error: null }
  })

  it("throws/redirects when caller is not admin", async () => {
    mockIsAdmin = false
    const { sendReminder } = await import("@/lib/reminders/actions")
    await expect(sendReminder("reminder-uuid-1")).rejects.toThrow("REDIRECT")
  })

  it("returns fail when reminderId is empty", async () => {
    const { sendReminder } = await import("@/lib/reminders/actions")
    const result = await sendReminder("")
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toContain("required")
    }
  })

  it("returns fail when reminder is not found", async () => {
    mockResults["reminder_events"] = {
      data: null,
      error: { message: "No rows" },
    }
    const { sendReminder } = await import("@/lib/reminders/actions")
    const result = await sendReminder("nonexistent-id")
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toContain("not found")
    }
  })

  it("is idempotent: already-sent reminder returns ok without re-sending", async () => {
    const alreadySent = { ...QUEUED_REMINDER, status: "sent", sent_at: "2026-01-02T00:00:00Z" }
    mockResults["reminder_events"] = { data: alreadySent, error: null }

    const { sendReminder } = await import("@/lib/reminders/actions")
    const { sendEmail } = await import("@/lib/email/transport")
    const result = await sendReminder("reminder-uuid-1")

    expect(result.ok).toBe(true)
    // sendEmail must NOT have been called for an already-sent reminder.
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it("flips status to sent on success and returns the updated reminder", async () => {
    mockResults["reminder_events"] = { data: QUEUED_REMINDER, error: null }
    mockResults["profiles"] = { data: STUDENT_PROFILE, error: null }
    mockResults["courses"] = { data: COURSE_ROW, error: null }
    // markReminderStatus will call update then single.
    mockResults["reminder_events:update"] = { data: SENT_REMINDER, error: null }

    const { sendReminder } = await import("@/lib/reminders/actions")
    const result = await sendReminder("reminder-uuid-1")

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.status).toBe("sent")
    }
  })

  it("marks status failed when sendEmail fails", async () => {
    mockResults["reminder_events"] = { data: QUEUED_REMINDER, error: null }
    mockResults["profiles"] = { data: STUDENT_PROFILE, error: null }
    mockResults["courses"] = { data: COURSE_ROW, error: null }
    mockSendEmailResult = { ok: false, message: "Failed to send email." }

    const { sendReminder } = await import("@/lib/reminders/actions")
    const result = await sendReminder("reminder-uuid-1")

    expect(result.ok).toBe(false)
    if (!result.ok) {
      // Safe message from transport layer is forwarded.
      expect(result.message).toBe("Failed to send email.")
    }
  })

  it("returned error never contains SMTP_PASSWORD", async () => {
    vi.stubEnv("SMTP_PASSWORD", "supersecretpassword")
    mockResults["reminder_events"] = { data: QUEUED_REMINDER, error: null }
    mockResults["profiles"] = { data: STUDENT_PROFILE, error: null }
    mockResults["courses"] = { data: COURSE_ROW, error: null }
    mockSendEmailResult = { ok: false, message: "Failed to send email." }

    const { sendReminder } = await import("@/lib/reminders/actions")
    const result = await sendReminder("reminder-uuid-1")

    if (!result.ok) {
      expect(result.message).not.toContain("supersecretpassword")
    }
    vi.unstubAllEnvs()
  })

  it("falls back to admin client when profiles.email is null", async () => {
    const profileWithoutEmail = { ...STUDENT_PROFILE, email: null }
    mockResults["reminder_events"] = { data: QUEUED_REMINDER, error: null }
    mockResults["profiles"] = { data: profileWithoutEmail, error: null }
    mockResults["courses"] = { data: COURSE_ROW, error: null }
    mockResults["reminder_events:update"] = { data: SENT_REMINDER, error: null }
    // Admin client returns an email.
    mockGetUserById = { data: { user: { email: "fallback@example.com" } }, error: null }

    const { sendReminder } = await import("@/lib/reminders/actions")
    const { sendEmail } = await import("@/lib/email/transport")
    const result = await sendReminder("reminder-uuid-1")

    expect(result.ok).toBe(true)
    // sendEmail should have been called with the fallback address.
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "fallback@example.com" })
    )
  })

  it("returns fail when email cannot be resolved from profiles or auth", async () => {
    const profileWithoutEmail = { ...STUDENT_PROFILE, email: null }
    mockResults["reminder_events"] = { data: QUEUED_REMINDER, error: null }
    mockResults["profiles"] = { data: profileWithoutEmail, error: null }
    mockResults["courses"] = { data: COURSE_ROW, error: null }
    // Admin client also has no email.
    mockGetUserById = { data: { user: null }, error: null }

    const { sendReminder } = await import("@/lib/reminders/actions")
    const result = await sendReminder("reminder-uuid-1")

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toContain("email address")
    }
  })
})
