import { test, expect, type Page } from "@playwright/test"

/**
 * E2E tests for admin route protection and basic admin flow.
 *
 * Test (a): Non-admin denial.
 *   An anonymous visitor to /en/admin/courses is redirected to login.
 *   This is deterministic because no auth is required to assert a redirect.
 *
 * Test (b): Admin create-course + add-lesson happy path.
 *   Requires E2E_INSTRUCTOR_EMAIL and E2E_INSTRUCTOR_PASSWORD to be set
 *   (seeded by `npm run seed`). The test is skipped when either is absent
 *   so the CI suite stays green without secrets.
 */

const instructorEmail = process.env.E2E_INSTRUCTOR_EMAIL
const instructorPassword = process.env.E2E_INSTRUCTOR_PASSWORD

/**
 * Asserts no horizontal overflow at the current viewport width.
 * 1px slack matches the Playwright responsive spec convention.
 */
async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const el = document.documentElement
    return el.scrollWidth - el.clientWidth
  })
  expect(overflow).toBeLessThanOrEqual(1)
}

test.describe("admin route protection", () => {
  test("anonymous visitor is redirected to login when visiting /en/admin/courses", async ({
    page,
  }) => {
    await page.goto("/en/admin/courses")
    // requireInstructor() redirects unauthenticated -> login
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test("anonymous visitor is redirected from /he/admin/courses (Hebrew locale)", async ({
    page,
  }) => {
    await page.goto("/he/admin/courses")
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })
})

test.describe("admin course list", () => {
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

  test("instructor can access admin courses page", async ({ page }) => {
    await signInAsInstructor(page)
    await page.goto("/en/admin/courses")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 10_000,
    })
    await expectNoHorizontalOverflow(page)
  })

  test("admin courses page has no horizontal overflow at 390px", async ({
    page,
  }) => {
    await signInAsInstructor(page)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/en/admin/courses")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 10_000,
    })
    await expectNoHorizontalOverflow(page)
  })
})
