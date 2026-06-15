import { test, expect, type Page } from "@playwright/test"

/**
 * Batch 21 home-hero + global-chrome contract. Asserts the DESIGN.md hero
 * renders its mandatory pieces (the `header_banner.png` artifact, exactly one
 * `<h1>`, and the paired Browse / Get Started CTAs), that the header leads with
 * the theme-scoped logo image instead of the old text wordmark, and that the
 * mobile Sheet drawer still opens below `md` for a guest. Overflow, theme, and
 * RTL are covered by `responsive.spec.ts`; this spec owns the hero/logo render.
 *
 * Accessible names below are the en-US catalog strings; the suite runs against
 * the `/en` locale so they are stable.
 */

const HOME = "/en"

/** The localized banner alt (Home.hero.bannerAlt) on `header_banner.png`. */
const BANNER_ALT = "A dark code editor showing a lesson project"
/** The localized logo alt (Brand.logoAlt) on both theme variants. */
const LOGO_ALT = "Eyal's Coding Academy"

test.describe("home hero", () => {
  test("renders the banner artifact, a single h1, and both CTAs", async ({
    page,
  }) => {
    await page.goto(HOME)

    // Exactly one <h1> (the hero headline).
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1)

    // The header_banner.png artifact is present and visible. next/image emits an
    // <img> carrying the localized alt; the src points at the brand asset.
    const banner = page.getByRole("img", { name: BANNER_ALT })
    await expect(banner).toBeVisible()
    await expect(banner).toHaveAttribute("src", /header_banner\.png/)

    // Dual CTA: a primary "Browse Courses" and a secondary "Get Started Free".
    // Both are links (rendered via the Button render-prop). Never a lone CTA.
    await expect(
      page.getByRole("link", { name: /browse courses/i }),
    ).toBeVisible()
    await expect(
      page.getByRole("link", { name: /get started free/i }),
    ).toBeVisible()
  })

  test("header shows the logo image instead of a text wordmark", async ({
    page,
  }) => {
    await page.goto(HOME)
    const header = page.getByRole("banner")

    // The logo renders both theme variants (light + dark) for a no-JS-safe CSS
    // swap; the hidden one is display:none, so exactly one is visible. Both
    // carry the localized alt. Assert the wordmark is now an image, not text.
    const visibleLogo = header
      .getByRole("img", { name: LOGO_ALT })
      .filter({ visible: true })
    await expect(visibleLogo).toHaveCount(1)
  })
})

test.describe("mobile header drawer (guest)", () => {
  test("opens the Sheet drawer below md and exposes the nav links", async ({
    page,
  }: {
    page: Page
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(HOME)

    const menuButton = page.getByRole("button", {
      name: /open navigation menu/i,
    })
    await expect(menuButton).toBeVisible()

    await menuButton.click()
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByRole("link", { name: /^courses$/i })).toBeVisible()

    // The hamburger is hidden once the viewport reaches desktop width.
    await page.keyboard.press("Escape")
    await page.setViewportSize({ width: 1280, height: 800 })
    await expect(menuButton).toBeHidden()
  })
})
