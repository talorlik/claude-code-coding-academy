import { test, expect, type Page } from "@playwright/test"

/**
 * E2e for the Batch 16 content pages (/about and /contact). Asserts both routes
 * hold the no-horizontal-overflow contract at the three reference viewports in
 * EN (LTR) and HE (RTL), expose the required landmarks and exactly one `<h1>`,
 * and that the contact form renders with labelled fields and a submit button.
 * All guest-reachable; no credentials needed.
 */

/** The three reference widths: mobile, tablet, desktop. */
const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
] as const

/** The new content routes, per locale prefix. */
const CONTENT_PAGES = [
  { name: "about-en", path: "/en/about", dir: "ltr", lang: "en-US" },
  { name: "about-he", path: "/he/about", dir: "rtl", lang: "he-IL" },
  { name: "contact-en", path: "/en/contact", dir: "ltr", lang: "en-US" },
  { name: "contact-he", path: "/he/contact", dir: "rtl", lang: "he-IL" },
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

test.describe("content pages: no horizontal overflow", () => {
  for (const vp of VIEWPORTS) {
    for (const target of CONTENT_PAGES) {
      test(`${target.name} has no horizontal overflow at ${vp.name} (${vp.width}px)`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height })
        await page.goto(target.path)
        await expect(page.getByRole("banner")).toBeVisible()
        const html = page.locator("html")
        await expect(html).toHaveAttribute("dir", target.dir)
        await expect(html).toHaveAttribute("lang", target.lang)
        await expectNoHorizontalOverflow(page)
      })
    }
  }
})

test.describe("content pages: landmarks and single h1", () => {
  for (const target of CONTENT_PAGES) {
    test(`${target.name} exposes main, banner, and exactly one h1`, async ({
      page,
    }) => {
      await page.goto(target.path)
      await expect(page.getByRole("main")).toBeVisible()
      await expect(page.getByRole("banner")).toBeVisible()
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1)
    })
  }
})

test.describe("about: real supplied content", () => {
  // The six section headings sourced from docs/content/ABOUT_*.md, per locale.
  // English is canonical; Hebrew maps key-for-key.
  const ABOUT_HEADINGS = {
    "/en/about": [
      "Learn to Code With Structure, Clarity, and Personal Attention",
      "A Smarter Way to Learn Programming",
      "Professional Teaching, Personal Guidance",
      "Built for Real Coding Skills",
      "AI Tutor Support Inside the Learning Context",
      "For Students Who Want to Build, Not Just Watch",
    ],
    "/he/about": [
      "ללמוד לתכנת עם מבנה, בהירות ויחס אישי",
      "דרך חכמה יותר ללמוד תכנות",
      "הוראה מקצועית, ליווי אישי",
      "בנויה לכישורי תכנות אמיתיים",
      "תמיכת מורה AI בתוך הקשר הלמידה",
      "לתלמידים שרוצים לבנות, לא רק לצפות",
    ],
  } as const

  for (const [path, headings] of Object.entries(ABOUT_HEADINGS)) {
    test(`${path} renders all six real section headings`, async ({ page }) => {
      await page.goto(path)
      for (const heading of headings) {
        await expect(
          page.getByRole("heading", { name: heading }),
        ).toBeVisible()
      }
    })
  }

  test("renders the section-4 five-step ordered list", async ({ page }) => {
    await page.goto("/en/about")
    const list = page
      .getByRole("list")
      .filter({ hasText: "Understand the concept." })
    await expect(list.getByRole("listitem")).toHaveCount(5)
  })

  for (const vp of VIEWPORTS) {
    for (const path of Object.keys(ABOUT_HEADINGS)) {
      test(`${path} has no horizontal overflow at ${vp.name} (${vp.width}px)`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height })
        await page.goto(path)
        await expectNoHorizontalOverflow(page)
      })
    }
  }
})

test.describe("contact: google maps region", () => {
  // The map region is env-driven: a Maps Embed iframe when
  // NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY is set, the labelled placeholder box
  // otherwise. The Playwright runner sees the same env the dev server does
  // (playwright.config.ts loads .env.local), so this single assertion drives
  // whichever branch the current environment selects - the iframe locally with
  // the key, the placeholder in secret-less CI.
  const hasKey = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY)

  for (const path of ["/en/contact", "/he/contact"]) {
    test(`${path} renders ${
      hasKey ? "the maps iframe" : "the placeholder"
    } per the key`, async ({ page }) => {
      await page.goto(path)

      const iframe = page.locator('iframe[src*="google.com/maps/embed"]')
      const placeholder = page.getByRole("img", { name: /tel aviv|תל אביב/i })

      if (hasKey) {
        await expect(iframe).toBeVisible()
        await expect(iframe).toHaveAttribute("loading", "lazy")
        await expect(iframe).toHaveAttribute("title", /.+/)
        await expect(placeholder).toHaveCount(0)
      } else {
        await expect(placeholder).toBeVisible()
        await expect(iframe).toHaveCount(0)
      }
    })
  }
})

test.describe("contact form", () => {
  test("renders labelled name, email, and message fields with a submit button", async ({
    page,
  }) => {
    await page.goto("/en/contact")

    // Fields are reached by their accessible name (the <label for> association),
    // which also proves the label wiring is correct.
    await expect(page.getByLabel("Name", { exact: true })).toBeVisible()
    await expect(page.getByLabel("Email", { exact: true })).toBeVisible()
    await expect(page.getByLabel("Message", { exact: true })).toBeVisible()
    await expect(
      page.getByRole("button", { name: /send message/i }),
    ).toBeVisible()
  })

  test("invalid submission reflects a localized error banner via the query channel", async ({
    page,
  }) => {
    // A too-short message trips server-side validation; the action redirects
    // back with ?error=messageTooShort, resolved to the localized banner. The
    // form sets noValidate so the browser does not block the submit first.
    await page.goto("/en/contact")
    await page.getByLabel("Name", { exact: true }).fill("Test User")
    await page.getByLabel("Email", { exact: true }).fill("test@example.com")
    await page.getByLabel("Message", { exact: true }).fill("hi")
    await page.getByRole("button", { name: /send message/i }).click()

    await expect(page).toHaveURL(/\/en\/contact\?error=messageTooShort/)
    // Scope to the banner's main landmark: getByRole("alert") alone also matches
    // Next's __next-route-announcer__ live region (strict-mode violation).
    await expect(
      page.getByRole("main").getByRole("alert"),
    ).toBeVisible()
  })

  test("valid submission acknowledges via a localized notice banner", async ({
    page,
  }) => {
    await page.goto("/en/contact")
    await page.getByLabel("Name", { exact: true }).fill("Test User")
    await page.getByLabel("Email", { exact: true }).fill("test@example.com")
    await page
      .getByLabel("Message", { exact: true })
      .fill("I would like to ask a question about the JavaScript course.")
    await page.getByRole("button", { name: /send message/i }).click()

    await expect(page).toHaveURL(/\/en\/contact\?notice=messageSent/)
    await expect(
      page.getByRole("main").getByRole("status"),
    ).toBeVisible()
  })
})
