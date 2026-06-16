import { test, expect, type Page } from "@playwright/test"

/**
 * E2E tests for the admin user-management area (Batch 26).
 *
 * Deterministic (no secrets):
 *   - An anonymous visitor to /en/admin/users is redirected to login.
 *
 * Authenticated (skipped unless the seeded credentials are present):
 *   - A student hitting /en/admin/users is redirected away (instructor-only).
 *   - The instructor sees the users table.
 *   - A role change round-trips (student -> instructor -> student), restoring
 *     the seeded state.
 *   - No horizontal overflow at 390/768/1280 in EN (LTR) and HE (RTL).
 */

const instructorEmail = process.env.E2E_INSTRUCTOR_EMAIL
const instructorPassword = process.env.E2E_INSTRUCTOR_PASSWORD
const studentEmail = process.env.E2E_STUDENT_EMAIL
const studentPassword = process.env.E2E_STUDENT_PASSWORD

/** Asserts no horizontal overflow at the current viewport (1px slack). */
async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const el = document.documentElement
    return el.scrollWidth - el.clientWidth
  })
  expect(overflow).toBeLessThanOrEqual(1)
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/en/login")
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole("button", { name: /^sign in$/i }).click()
  await expect(page).toHaveURL(/\/en\/(admin\/)?dashboard/, { timeout: 15_000 })
}

test.describe("admin users route protection", () => {
  test("anonymous visitor is redirected to login from /en/admin/users", async ({
    page,
  }) => {
    await page.goto("/en/admin/users")
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test("anonymous visitor is redirected from /he/admin/users (RTL locale)", async ({
    page,
  }) => {
    await page.goto("/he/admin/users")
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })
})

test.describe("student is denied the admin users area", () => {
  test.skip(
    !studentEmail || !studentPassword,
    "Skipped: E2E_STUDENT_EMAIL / E2E_STUDENT_PASSWORD not set"
  )

  test("a signed-in student visiting /en/admin/users is redirected to home", async ({
    page,
  }) => {
    await signIn(page, studentEmail!, studentPassword!)
    await page.goto("/en/admin/users")
    // requireInstructor() sends a signed-in non-instructor to the home page.
    await expect(page).toHaveURL(/\/en\/?$/, { timeout: 10_000 })
  })
})

test.describe("admin users area (instructor)", () => {
  test.skip(
    !instructorEmail || !instructorPassword,
    "Skipped: E2E_INSTRUCTOR_EMAIL / E2E_INSTRUCTOR_PASSWORD not set"
  )

  test("instructor sees the users table", async ({ page }) => {
    await signIn(page, instructorEmail!, instructorPassword!)
    await page.goto("/en/admin/users")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByRole("table")).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })

  test("no horizontal overflow at 390/768/1280 in EN and HE", async ({
    page,
  }) => {
    await signIn(page, instructorEmail!, instructorPassword!)
    for (const path of ["/en/admin/users", "/he/admin/users"]) {
      for (const width of [390, 768, 1280]) {
        await page.setViewportSize({ width, height: 900 })
        await page.goto(path)
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible({
          timeout: 10_000,
        })
        await expectNoHorizontalOverflow(page)
      }
    }
  })

  test("a role change round-trips and restores the seeded student role", async ({
    page,
  }) => {
    test.skip(
      !studentEmail,
      "Skipped: E2E_STUDENT_EMAIL not set (needed to locate the student row)"
    )
    await signIn(page, instructorEmail!, instructorPassword!)
    await page.goto("/en/admin/users")

    // Open the student's detail page from their email row.
    const row = page.getByRole("row", { name: new RegExp(studentEmail!, "i") })
    await row.getByRole("link", { name: /view/i }).click()
    await expect(page).toHaveURL(/\/en\/admin\/users\/[0-9a-f-]+/, {
      timeout: 10_000,
    })
    const detailUrl = page.url().split("?")[0]

    // This test mutates the live seeded student's role. The seed invariant is
    // "student is a student", and other specs depend on it, so the demotion is
    // in a finally that always runs - a mid-test failure can never leave the
    // student promoted and pollute the rest of the suite.
    try {
      // Promote student -> instructor.
      await page.locator("select#role").selectOption("instructor")
      await page.getByRole("button", { name: /save role/i }).click()
      await expect(page).toHaveURL(/notice=roleChanged/, { timeout: 10_000 })
    } finally {
      // Demote instructor -> student, restoring the seeded state.
      await page.goto(detailUrl)
      await page.locator("select#role").selectOption("student")
      await page.getByRole("button", { name: /save role/i }).click()
      await expect(page).toHaveURL(/notice=roleChanged/, { timeout: 10_000 })
    }
  })
})
