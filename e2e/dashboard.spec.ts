import { test, expect, type Page } from "@playwright/test"

/**
 * E2E tests for the student and admin dashboards.
 *
 * Unauthenticated redirect tests run unconditionally.
 * Authenticated smoke tests are guarded behind optional env vars and skip
 * cleanly when credentials are absent.
 */

const studentEmail = process.env.E2E_STUDENT_EMAIL
const studentPassword = process.env.E2E_STUDENT_PASSWORD
const instructorEmail = process.env.E2E_INSTRUCTOR_EMAIL
const instructorPassword = process.env.E2E_INSTRUCTOR_PASSWORD

/** Asserts no horizontal overflow at the current viewport width. */
async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const el = document.documentElement
    return el.scrollWidth - el.clientWidth
  })
  expect(overflow).toBeLessThanOrEqual(1)
}

// ---------------------------------------------------------------------------
// Redirect tests - no credentials required
// ---------------------------------------------------------------------------

test.describe("dashboard redirect protection", () => {
  test("anonymous visitor visiting /en/dashboard is redirected to login", async ({
    page,
  }) => {
    await page.goto("/en/dashboard")
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test("anonymous visitor visiting /he/dashboard is redirected to login (Hebrew locale)", async ({
    page,
  }) => {
    await page.goto("/he/dashboard")
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test("anonymous visitor visiting /en/admin/dashboard is redirected to login", async ({
    page,
  }) => {
    await page.goto("/en/admin/dashboard")
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test("anonymous visitor visiting /he/admin/dashboard is redirected to login", async ({
    page,
  }) => {
    await page.goto("/he/admin/dashboard")
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test("/en/dashboard redirect target has no horizontal overflow at 390px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/en/dashboard")
    // Should redirect to login; check login page for overflow.
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
    await expect(page.getByRole("main")).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })
})

// ---------------------------------------------------------------------------
// Authenticated student dashboard smoke test
// ---------------------------------------------------------------------------

test.describe("student dashboard smoke", () => {
  test.skip(
    !studentEmail || !studentPassword,
    "Skipped: E2E_STUDENT_EMAIL / E2E_STUDENT_PASSWORD not set"
  )

  async function signInAsStudent(page: Page) {
    await page.goto("/en/login")
    await page.getByLabel(/email/i).fill(studentEmail!)
    await page.getByLabel(/password/i).fill(studentPassword!)
    await page.getByRole("button", { name: /^sign in$/i }).click()
    await expect(page).toHaveURL(/\/en\/dashboard/, { timeout: 15_000 })
  }

  test("student can access dashboard and sees an h1", async ({ page }) => {
    await signInAsStudent(page)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 10_000,
    })
    await expectNoHorizontalOverflow(page)
  })

  test("student dashboard has no overflow at 390px", async ({ page }) => {
    await signInAsStudent(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/en/dashboard")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 10_000,
    })
    await expectNoHorizontalOverflow(page)
  })
})

// ---------------------------------------------------------------------------
// Authenticated admin dashboard smoke test
// ---------------------------------------------------------------------------

test.describe("admin dashboard smoke", () => {
  test.skip(
    !instructorEmail || !instructorPassword,
    "Skipped: E2E_INSTRUCTOR_EMAIL / E2E_INSTRUCTOR_PASSWORD not set"
  )

  async function signInAsInstructor(page: Page) {
    await page.goto("/en/login")
    await page.getByLabel(/email/i).fill(instructorEmail!)
    await page.getByLabel(/password/i).fill(instructorPassword!)
    await page.getByRole("button", { name: /^sign in$/i }).click()
    // Post-login role routing (batch 24): instructors land on the admin
    // dashboard, not the student dashboard.
    await expect(page).toHaveURL(/\/en\/admin\/dashboard/, { timeout: 15_000 })
  }

  test("instructor can access /en/admin/dashboard and sees an h1", async ({
    page,
  }) => {
    await signInAsInstructor(page)
    await page.goto("/en/admin/dashboard")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 10_000,
    })
    await expectNoHorizontalOverflow(page)
  })

  test("admin dashboard has no overflow at 390px", async ({ page }) => {
    await signInAsInstructor(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/en/admin/dashboard")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 10_000,
    })
    await expectNoHorizontalOverflow(page)
  })
})
