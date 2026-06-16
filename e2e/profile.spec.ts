import { test, expect, type Page } from "@playwright/test"

import { signIn } from "./helpers/auth"

/**
 * E2E tests for the user profile page (Batch 25).
 *
 * Redirect-protection and no-overflow tests run unconditionally (no
 * credentials). The authenticated smoke tests - the header Profile link, all
 * field groups rendering, and the contact-details round-trip - are guarded
 * behind the seeded student credentials and skip cleanly when those are absent,
 * matching the dashboard/admin suites.
 */

const studentEmail = process.env.E2E_STUDENT_EMAIL
const studentPassword = process.env.E2E_STUDENT_PASSWORD

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
] as const

/** Asserts no horizontal overflow at the current viewport width. */
async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const el = document.documentElement
    return el.scrollWidth - el.clientWidth
  })
  expect(overflow).toBeLessThanOrEqual(1)
}

// ---------------------------------------------------------------------------
// Redirect protection - no credentials required
// ---------------------------------------------------------------------------
test.describe("profile redirect protection", () => {
  test("anonymous visitor at /en/profile is redirected to login", async ({
    page,
  }) => {
    await page.goto("/en/profile")
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test("anonymous visitor at /he/profile is redirected to login", async ({
    page,
  }) => {
    await page.goto("/he/profile")
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })
})

// ---------------------------------------------------------------------------
// Authenticated smoke - guarded by seeded student credentials
// ---------------------------------------------------------------------------
test.describe("profile page (authenticated)", () => {
  test.skip(
    !studentEmail || !studentPassword,
    "Skipped: E2E_STUDENT_EMAIL / E2E_STUDENT_PASSWORD not set"
  )

  test("a signed-in user sees the Profile link in the header", async ({
    page,
  }) => {
    await signIn(page, studentEmail!, studentPassword!)
    // The link is in the header nav (inline on desktop). Default Playwright
    // viewport is 1280px wide, so the inline nav (md+) is visible.
    await expect(
      page.getByRole("banner").getByRole("link", { name: /^profile$/i })
    ).toBeVisible()
  })

  test("the profile page renders all five field groups", async ({ page }) => {
    await signIn(page, studentEmail!, studentPassword!)
    await page.goto("/en/profile")

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    // One labelled section heading per group.
    for (const heading of [
      /contact details/i,
      /^email$/i,
      /^password$/i,
      /^avatar$/i,
      /^language$/i,
    ]) {
      await expect(
        page.getByRole("heading", { level: 2, name: heading })
      ).toBeVisible()
    }
    // Representative fields from each form.
    await expect(page.getByLabel(/full name/i)).toBeVisible()
    await expect(page.getByLabel(/email address/i)).toBeVisible()
    // "New password" exactly, to avoid matching "Confirm new password" too
    // (Playwright getByLabel is strict-mode; a substring match would resolve
    // two elements).
    await expect(page.getByLabel("New password", { exact: true })).toBeVisible()
    await expect(
      page.getByLabel("Confirm new password", { exact: true })
    ).toBeVisible()
    await expect(page.getByLabel(/profile picture/i)).toBeVisible()
    await expect(page.getByLabel(/preferred language/i)).toBeVisible()
  })

  test("the contact-details round-trip shows a success banner", async ({
    page,
  }) => {
    await signIn(page, studentEmail!, studentPassword!)
    await page.goto("/en/profile")

    await page.getByLabel(/full name/i).fill("E2E Test User")
    await page
      .getByRole("button", { name: /save details/i })
      .click()

    // The action redirects back with ?notice=detailsSaved, resolved to a
    // localized banner with role="status".
    await expect(page).toHaveURL(/\/profile\?notice=detailsSaved/, {
      timeout: 15_000,
    })
    await expect(page.getByRole("status")).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// No horizontal overflow at every breakpoint, EN (LTR) and HE (RTL)
// ---------------------------------------------------------------------------
// The page is requireUser()-guarded, so an anonymous visit redirects to login.
// We assert no overflow at the rendered destination (login when signed out, or
// the profile page itself when credentials are present), in both locales.
test.describe("profile no horizontal overflow", () => {
  for (const vp of VIEWPORTS) {
    test(`/en/profile destination has no overflow at ${vp.name} (${vp.width}px)`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      if (studentEmail && studentPassword) {
        await signIn(page, studentEmail, studentPassword)
      }
      await page.goto("/en/profile")
      await expect(page.getByRole("main")).toBeVisible()
      await expectNoHorizontalOverflow(page)
    })

    test(`/he/profile destination is RTL with no overflow at ${vp.name} (${vp.width}px)`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      if (studentEmail && studentPassword) {
        await signIn(page, studentEmail, studentPassword)
      }
      await page.goto("/he/profile")
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl")
      await expect(page.getByRole("main")).toBeVisible()
      await expectNoHorizontalOverflow(page)
    })
  }
})
