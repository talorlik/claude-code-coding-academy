import { test, expect, type Page } from "@playwright/test"

/**
 * E2e for the Batch 23 Unsplash imagery placements. Asserts that:
 *
 * - About and Contact each render a coding photo with a visible, linked credit
 *   ("Photo by … on Unsplash" - the photographer profile and the Unsplash page
 *   are both real anchors);
 * - the auth side panel photo is hidden below `md` and visible at `md+`, with a
 *   consolidated credit line;
 * - none of these pages overflow horizontally at 390/768/1280 in EN (LTR) and
 *   HE (RTL).
 *
 * All routes are guest-reachable; no credentials needed. The photos are
 * self-hosted under public/images/unsplash, so this passes offline.
 */

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
] as const

/** Pages that carry an always-visible photo + credit, per locale. */
const PHOTO_PAGES = [
  { name: "about-en", path: "/en/about", dir: "ltr" },
  { name: "about-he", path: "/he/about", dir: "rtl" },
  { name: "contact-en", path: "/en/contact", dir: "ltr" },
  { name: "contact-he", path: "/he/contact", dir: "rtl" },
  { name: "login-en", path: "/en/login", dir: "ltr" },
  { name: "login-he", path: "/he/login", dir: "rtl" },
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

/** The "Unsplash" credit link points at unsplash.com. Locale-agnostic check. */
function unsplashCreditLinks(page: Page) {
  return page.locator(
    'main a[href^="https://unsplash.com/photos/"], main a[href^="https://unsplash.com/@"]',
  )
}

test.describe("unsplash imagery: no horizontal overflow", () => {
  for (const vp of VIEWPORTS) {
    for (const target of PHOTO_PAGES) {
      test(`${target.name} has no horizontal overflow at ${vp.name} (${vp.width}px)`, async ({
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
})

test.describe("unsplash imagery: visible credit on About and Contact", () => {
  for (const target of [
    { name: "about-en", path: "/en/about", photographer: "Ilya Pavlov" },
    { name: "contact-en", path: "/en/contact", photographer: "Arnold Francisca" },
  ] as const) {
    test(`${target.name} shows a coding photo with a linked Unsplash credit`, async ({
      page,
    }) => {
      await page.goto(target.path)

      // The photo itself rendered (next/image emits an <img>).
      await expect(
        page.locator('main img[src*="/images/unsplash/"], main img[src*="_next/image"]').first(),
      ).toBeVisible()

      // A visible credit line with both the photographer-profile link and the
      // Unsplash-photo link.
      const credit = page.getByText(/Photo by .+ on Unsplash/i).first()
      await expect(credit).toBeVisible()
      await expect(
        page.getByRole("link", { name: target.photographer }).first(),
      ).toBeVisible()
      await expect(unsplashCreditLinks(page).first()).toBeVisible()
    })
  }
})

test.describe("unsplash imagery: auth side panel is responsive", () => {
  // next/image rewrites src to /_next/image?url=...laptop-colorcode... ; match on
  // the encoded local filename to target this specific photo.
  const authPhoto = (page: Page) =>
    page.locator('main img[src*="laptop-colorcode"]')

  test("the auth photo is hidden below md", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/en/login")
    // The panel wrapper is `hidden md:flex`, so the photo is in the DOM but not
    // displayed.
    await expect(authPhoto(page)).toBeHidden()
    // The credit line lives inside the same hidden panel.
    await expect(page.getByText(/Photo by .+ on Unsplash/i).first()).toBeHidden()
    await expectNoHorizontalOverflow(page)
  })

  test("the auth photo and its credit are visible at md+", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto("/en/login")
    await expect(authPhoto(page)).toBeVisible()
    await expect(page.getByText(/Photo by .+ on Unsplash/i).first()).toBeVisible()
    await expectNoHorizontalOverflow(page)
  })
})
