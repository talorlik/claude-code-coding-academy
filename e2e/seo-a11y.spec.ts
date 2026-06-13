import { test, expect } from "@playwright/test"

/**
 * SEO and accessibility e2e smoke tests.
 *
 * Covers:
 * - `html[lang]` and `html[dir]` are correct for /en (ltr) and /he (rtl).
 * - Each public page has exactly one <h1>.
 * - Each page has a <main id="main-content"> landmark.
 * - Unauthenticated requests to /en/dashboard and /en/admin/courses are
 *   redirected to the login page (auth guard is enforced).
 *
 * These checks run against the live dev server started by Playwright. No
 * credentials are required for the guest assertions.
 */

test.describe("lang + dir attributes", () => {
  test("English home: lang starts with 'en', dir=ltr", async ({ page }) => {
    await page.goto("/en")
    const lang = await page.locator("html").getAttribute("lang")
    const dir = await page.locator("html").getAttribute("dir")
    // The locale layout sets lang to the full BCP47 tag (e.g. "en-US").
    expect(lang).toMatch(/^en/)
    expect(dir).toBe("ltr")
  })

  test("Hebrew home: lang starts with 'he', dir=rtl", async ({ page }) => {
    await page.goto("/he")
    const lang = await page.locator("html").getAttribute("lang")
    const dir = await page.locator("html").getAttribute("dir")
    // The locale layout sets lang to the full BCP47 tag (e.g. "he-IL").
    expect(lang).toMatch(/^he/)
    expect(dir).toBe("rtl")
  })
})

test.describe("landmark + heading structure (public pages)", () => {
  test("English home has <main id=main-content> and exactly one <h1>", async ({
    page,
  }) => {
    await page.goto("/en")
    const main = page.locator("main#main-content")
    await expect(main).toBeVisible()

    const h1s = await page.locator("h1").count()
    expect(h1s).toBe(1)
  })

  test("English login has <main id=main-content> and exactly one <h1>", async ({
    page,
  }) => {
    await page.goto("/en/login")
    const main = page.locator("main#main-content")
    await expect(main).toBeVisible()

    const h1s = await page.locator("h1").count()
    expect(h1s).toBe(1)
  })

  test("Hebrew home has <main id=main-content> and exactly one <h1>", async ({
    page,
  }) => {
    await page.goto("/he")
    const main = page.locator("main#main-content")
    await expect(main).toBeVisible()

    const h1s = await page.locator("h1").count()
    expect(h1s).toBe(1)
  })
})

test.describe("private pages redirect to login when unauthenticated", () => {
  test("/en/dashboard redirects to login", async ({ page }) => {
    await page.goto("/en/dashboard")
    // The auth guard redirects non-authed requests to the login page.
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })

  test("/en/admin/courses redirects to login", async ({ page }) => {
    await page.goto("/en/admin/courses")
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 })
  })
})
