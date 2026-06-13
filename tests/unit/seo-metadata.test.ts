/**
 * Unit tests for SEO metadata on public vs private pages.
 *
 * Private pages (dashboard, all /admin/* routes) must set
 * `robots: { index: false, follow: false }` to prevent crawlers from indexing
 * the management UI.
 *
 * Strategy: mock every dependency at the module level, then import and call
 * generateMetadata with a minimal params promise. The mocked `getTranslations`
 * returns a callable function that echoes the key, satisfying `t("some.key")`
 * calls without a real i18n runtime.
 */

import { describe, it, expect, vi } from "vitest"

// ---------------------------------------------------------------------------
// Mocks - must be declared before any dynamic imports of page modules.
// ---------------------------------------------------------------------------

// Make getTranslations return a callable function (not just a Proxy object),
// and setRequestLocale a no-op.
vi.mock("next-intl/server", () => ({
  getTranslations: vi.fn().mockResolvedValue((key: string) => key),
  setRequestLocale: vi.fn(),
}))

// Supabase server client.
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  }),
}))

// Course queries.
vi.mock("@/lib/courses/queries", () => ({
  getPublishedCourses: vi.fn().mockResolvedValue([]),
  getCourseDetailBySlug: vi.fn().mockResolvedValue(null),
}))

// Progress / enrollment queries.
vi.mock("@/lib/progress/queries", () => ({
  getEnrollment: vi.fn().mockResolvedValue(null),
  getCourseProgress: vi.fn().mockResolvedValue({
    totalLessons: 0,
    completedLessons: 0,
    percent: 0,
    lastWatchedAt: null,
    isComplete: false,
    nextLessonId: null,
  }),
}))

// Tutor queries.
vi.mock("@/lib/tutor/queries", () => ({
  getConversationMessages: vi.fn().mockResolvedValue([]),
  listConversationsForCourse: vi.fn().mockResolvedValue([]),
}))

// Auth guards.
vi.mock("@/lib/auth/require-user", () => ({
  requireUser: vi.fn().mockResolvedValue("user-uuid"),
  requireInstructor: vi.fn().mockResolvedValue("instructor-uuid"),
}))
vi.mock("@/lib/auth/guards", () => ({
  requireAdmin: vi.fn().mockResolvedValue("instructor-uuid"),
  getIsAdmin: vi.fn().mockResolvedValue(false),
}))

// next/navigation (notFound etc.).
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => { throw new Error("NOT_FOUND") }),
  redirect: vi.fn(),
}))

// Admin queries.
vi.mock("@/lib/admin/queries", () => ({
  getCourseForEdit: vi.fn().mockResolvedValue(null),
  listAllCourses: vi.fn().mockResolvedValue([]),
  listLessonsForCourse: vi.fn().mockResolvedValue([]),
}))

// Dashboard queries.
vi.mock("@/lib/dashboard/student-queries", () => ({
  getEnrolledCoursesWithProgress: vi.fn().mockResolvedValue([]),
  getWeeklyProgressSummary: vi.fn().mockResolvedValue({ days: [], totalCount: 0 }),
  getRecentlyWatchedLessons: vi.fn().mockResolvedValue([]),
  getAchievementBadges: vi.fn().mockResolvedValue([]),
}))
vi.mock("@/lib/dashboard/admin-queries", () => ({
  getAdminOverviewStats: vi.fn().mockResolvedValue(null),
  getCourseCompletionRates: vi.fn().mockResolvedValue([]),
  getStuckStudents: vi.fn().mockResolvedValue([]),
  getCommonTutorQuestions: vi.fn().mockResolvedValue([]),
  getRecentCourseActivity: vi.fn().mockResolvedValue([]),
}))

// i18n routing (navigation helpers used in pages).
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: unknown }) =>
    ({ type: "a", props: { href, children } }),
  useRouter: vi.fn().mockReturnValue({ push: vi.fn() }),
  redirect: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SEO: admin layout exports static metadata with robots noindex", () => {
  it("admin layout metadata.robots.index === false", async () => {
    // The admin layout exports a static `metadata` const - no async call needed.
    const mod = await import("@/app/[locale]/admin/layout")
    const { metadata } = mod as unknown as {
      metadata?: { robots?: { index?: boolean; follow?: boolean } }
    }
    expect(metadata).toBeDefined()
    expect(metadata?.robots?.index).toBe(false)
    expect(metadata?.robots?.follow).toBe(false)
  })
})

describe("SEO: private page generateMetadata sets robots noindex", () => {
  it("dashboard page: robots.index === false", async () => {
    const { generateMetadata } = await import("@/app/[locale]/dashboard/page")
    const meta = await generateMetadata({
      params: Promise.resolve({ locale: "en" }),
    })
    const robots = meta.robots as { index?: boolean } | undefined
    expect(robots?.index).toBe(false)
  })

  it("chat page: robots.index === false", async () => {
    const { generateMetadata } = await import("@/app/[locale]/chat/page")
    const meta = await generateMetadata()
    const robots = meta.robots as { index?: boolean } | undefined
    expect(robots?.index).toBe(false)
  })
})

describe("SEO: public page generateMetadata does NOT set noindex", () => {
  it("home page: robots.index is not false", async () => {
    const { generateMetadata } = await import("@/app/[locale]/page")
    const meta = await generateMetadata({
      params: Promise.resolve({ locale: "en" }),
    })
    const robots = meta.robots as { index?: boolean } | undefined
    expect(robots?.index).not.toBe(false)
  })

  it("course page: robots.index is not false (course not found returns {})", async () => {
    const { generateMetadata } = await import(
      "@/app/[locale]/courses/[courseSlug]/page"
    )
    const meta = await generateMetadata({
      params: Promise.resolve({ locale: "en", courseSlug: "test-course" }),
    })
    const robots = meta.robots as { index?: boolean } | undefined
    expect(robots?.index).not.toBe(false)
  })
})
