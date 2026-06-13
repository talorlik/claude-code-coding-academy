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
