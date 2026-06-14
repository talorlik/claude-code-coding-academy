import { test, expect, type Page } from "@playwright/test"

/**
 * Smoke tests for the public home page / catalog.
 *
 * Asserts that:
 * - The hero h1 is present in both EN and HE.
 * - A catalog region is present.
 * - No horizontal overflow at 390px (mobile).
 * - The catalog renders without requiring authentication.
 *
 * Enrollment E2E is deferred to batch 12 where full auth seeding is stable.
 */

/**
 * Asserts the document does not scroll horizontally.
 * A 1px slack absorbs sub-pixel rounding (mirrors responsive.spec.ts).
 */
async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const el = document.documentElement
    return el.scrollWidth - el.clientWidth
  })
  expect(overflow).toBeLessThanOrEqual(1)
}

test.describe("home page catalog - public access", () => {
  test("EN home page renders hero h1 and catalog section", async ({
    page,
  }) => {
    await page.goto("/en")
    await expect(page.getByRole("main")).toBeVisible()

    // Exactly one h1 on the page.
    const h1 = page.getByRole("heading", { level: 1 })
    await expect(h1).toBeVisible()
    await expect(h1).not.toBeEmpty()

    // Catalog section is present (section with id="catalog" or aria-label).
    const catalog = page.locator("#catalog")
    await expect(catalog).toBeVisible()
  })

  test("HE home page renders hero h1 and catalog section (RTL)", async ({
    page,
  }) => {
    await page.goto("/he")
    await expect(page.getByRole("main")).toBeVisible()

    const h1 = page.getByRole("heading", { level: 1 })
    await expect(h1).toBeVisible()
    await expect(h1).not.toBeEmpty()

    const catalog = page.locator("#catalog")
    await expect(catalog).toBeVisible()
  })

  test("EN home page has no horizontal overflow at 390px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/en")
    await expect(page.getByRole("banner")).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })

  test("HE home page has no horizontal overflow at 390px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/he")
    await expect(page.getByRole("banner")).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })

  test("catalog renders course cards or empty state when loaded", async ({
    page,
  }) => {
    await page.goto("/en")

    // Wait for the Suspense skeleton to clear: the skeleton uses aria-busy
    // so wait until the catalog area no longer contains aria-busy elements.
    const catalog = page.locator("#catalog")
    await expect(catalog).toBeVisible({ timeout: 15_000 })

    // Wait for either course content or the empty state to appear.
    // Use waitForFunction to poll until the catalog has settled.
    await page.waitForFunction(
      () => {
        const catalog = document.getElementById("catalog")
        if (!catalog) return false
        // Skeleton still present -> not settled.
        const busy = catalog.querySelector("[aria-busy='true']")
        if (busy) return false
        // Settled: either has links (cards) or the empty-state text.
        return catalog.querySelectorAll("a").length > 0
          || !!catalog.querySelector("[data-slot='empty-title']")
      },
      { timeout: 15_000 }
    )

    // Verify no horizontal overflow once content is loaded.
    const overflow = await page.evaluate(() => {
      const el = document.documentElement
      return el.scrollWidth - el.clientWidth
    })
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test("EN home page has no horizontal overflow at 768px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto("/en")
    await expect(page.getByRole("banner")).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })

  test("EN home page has no horizontal overflow at 1280px", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto("/en")
    await expect(page.getByRole("banner")).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })
})

// ---------------------------------------------------------------------------
// /courses catalog (Batch 18)
// ---------------------------------------------------------------------------

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
] as const

const CATALOG_PAGES = [
  { name: "en", path: "/en/courses", dir: "ltr" },
  { name: "he", path: "/he/courses", dir: "rtl" },
] as const

test.describe("courses catalog page", () => {
  for (const vp of VIEWPORTS) {
    for (const target of CATALOG_PAGES) {
      test(`${target.name} catalog has no horizontal overflow at ${vp.name} (${vp.width}px)`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height })
        await page.goto(target.path)
        await expect(page.getByRole("banner")).toBeVisible()
        await expect(page.locator("html")).toHaveAttribute("dir", target.dir)
        await expectNoHorizontalOverflow(page)
      })
    }
  }

  test("exposes main, exactly one h1, and the filter form", async ({ page }) => {
    await page.goto("/en/courses")
    await expect(page.getByRole("main")).toBeVisible()
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1)
    // The no-JS filter form (search role) with its controls.
    const filters = page.getByRole("search", { name: /course filters/i })
    await expect(filters).toBeVisible()
    await expect(filters.getByLabel("Category")).toBeVisible()
    await expect(filters.getByLabel("Sort by")).toBeVisible()
  })

  test("the sort control change is reflected in the URL query (no-JS form)", async ({
    page,
  }) => {
    await page.goto("/en/courses")
    const filters = page.getByRole("search", { name: /course filters/i })
    await filters.getByLabel("Sort by").selectOption("rated")
    await filters.getByRole("button", { name: /apply/i }).click()
    await expect(page).toHaveURL(/[?&]sort=rated/)
  })

  test("the search box filters via the query string", async ({ page }) => {
    await page.goto("/en/courses")
    const filters = page.getByRole("search", { name: /course filters/i })
    await filters.getByLabel("Search").fill("javascript")
    await filters.getByRole("button", { name: /apply/i }).click()
    await expect(page).toHaveURL(/[?&]q=javascript/)
    await expect(page.getByRole("main")).toBeVisible()
  })

  test("My Courses is hidden for anonymous visitors", async ({ page }) => {
    await page.goto("/en/courses")
    await expect(page.getByText("My courses", { exact: true })).toHaveCount(0)
  })

  test("/search redirects to /courses preserving q", async ({ page }) => {
    await page.goto("/en/search?q=react")
    await expect(page).toHaveURL(/\/en\/courses\?q=react/)
  })
})
