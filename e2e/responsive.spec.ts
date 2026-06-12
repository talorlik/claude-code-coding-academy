import { test, expect, type Page } from "@playwright/test"

import { instructorCredentials, signIn } from "./helpers/auth"

/**
 * Responsive, theme, and RTL e2e. Asserts the guest-reachable shell (home +
 * login) holds up at the three reference viewports with no horizontal overflow,
 * that the theme toggle round-trips, and that the Hebrew shell renders RTL at
 * every viewport. No credentials are needed for the guest suite. A final
 * authenticated check guards the signed-in header's mobile collapse; it skips
 * when instructor credentials are unset.
 */

/** The three reference widths: mobile, tablet, desktop. */
const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
] as const

/** Guest-reachable pages that exercise the localized shell. */
const GUEST_PAGES = [
  { name: "home", path: "/en" },
  { name: "login", path: "/en/login" },
] as const

/**
 * Asserts the document does not scroll horizontally - a viewport-aware proxy for
 * "nothing overflows its container". A 1px slack absorbs sub-pixel rounding.
 */
async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const el = document.documentElement
    return el.scrollWidth - el.clientWidth
  })
  expect(overflow).toBeLessThanOrEqual(1)
}

test.describe("responsive layouts", () => {
  for (const vp of VIEWPORTS) {
    for (const target of GUEST_PAGES) {
      test(`${target.name} has no horizontal overflow at ${vp.name} (${vp.width}px)`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height })
        await page.goto(target.path)
        await expect(page.getByRole("banner")).toBeVisible()
        await expectNoHorizontalOverflow(page)
      })
    }
  }

  test("the homepage heading and main render at mobile width", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/en")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(page.getByRole("main")).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })
})

test.describe("theme toggle", () => {
  test("round-trips light to dark to light and persists", async ({ page }) => {
    await page.goto("/en")
    const html = page.locator("html")

    await page.getByRole("button", { name: /toggle theme/i }).click()
    await page.getByRole("menuitem", { name: /^dark$/i }).click()
    await expect(html).toHaveClass(/dark/, { timeout: 10_000 })

    await page.reload()
    await expect(html).toHaveClass(/dark/, { timeout: 10_000 })

    await page.getByRole("button", { name: /toggle theme/i }).click()
    await page.getByRole("menuitem", { name: /^light$/i }).click()
    await expect(html).not.toHaveClass(/dark/, { timeout: 10_000 })
  })
})

test.describe("Hebrew RTL across viewports", () => {
  for (const vp of VIEWPORTS) {
    test(`the Hebrew home is rtl at ${vp.name} (${vp.width}px)`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await page.goto("/he")
      const html = page.locator("html")
      await expect(html).toHaveAttribute("dir", "rtl")
      await expect(html).toHaveAttribute("lang", "he-IL")
      await expectNoHorizontalOverflow(page)
    })
  }

  test("the Hebrew login is rtl and free of overflow at mobile width", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/he/login")
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl")
    await expectNoHorizontalOverflow(page)
  })
})

test.describe("authenticated header at mobile width", () => {
  test("the dashboard has no horizontal overflow at 390px", async ({
    page,
  }) => {
    const { email, password } = instructorCredentials
    test.skip(
      !email || !password,
      "E2E_INSTRUCTOR_EMAIL / E2E_INSTRUCTOR_PASSWORD not set",
    )
    await signIn(page, email!, password!)
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/en/dashboard")
    await expect(page.getByRole("banner")).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })
})

test.describe("header collapses on mobile", () => {
  test("signed-in nav collapses into a drawer below md and is inline on desktop", async ({
    page,
  }) => {
    const { email, password } = instructorCredentials
    test.skip(
      !email || !password,
      "E2E_INSTRUCTOR_EMAIL / E2E_INSTRUCTOR_PASSWORD not set",
    )
    await signIn(page, email!, password!)

    // Mobile: the hamburger menu button is visible; opening it reveals the
    // Dashboard link inside the drawer dialog.
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/en/dashboard")
    const menuButton = page.getByRole("button", {
      name: /open navigation menu/i,
    })
    await expect(menuButton).toBeVisible()

    await menuButton.click()
    const dialog = page.getByRole("dialog")
    await expect(
      dialog.getByRole("link", { name: /^dashboard$/i }),
    ).toBeVisible()
    await page.keyboard.press("Escape")

    // Desktop: the hamburger is hidden and exactly one Dashboard link is visible
    // (the inline nav link; the drawer link lives in a closed Sheet and is not
    // visible, so scoping to visible links avoids a strict-mode ambiguity).
    await page.setViewportSize({ width: 1280, height: 800 })
    await expect(menuButton).toBeHidden()
    const visibleDashboard = page
      .getByRole("link", { name: /^dashboard$/i })
      .filter({ visible: true })
    await expect(visibleDashboard).toHaveCount(1)
  })
})
