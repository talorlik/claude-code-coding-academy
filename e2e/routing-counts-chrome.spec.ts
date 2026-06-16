import { test, expect, type Page } from "@playwright/test"

import { instructorCredentials, signIn } from "./helpers/auth"

/**
 * E2E for batch 24: auth routing, count fixes, course auto-scroll guard, and
 * global chrome (header logo border clearance, footer logo removal).
 *
 * Covers:
 * - The course page is anchored at the top on load; the tutor panel low on the
 *   page is NOT scrolled into view (issue #4).
 * - The header and footer have no horizontal overflow at 390/768/1280 in EN
 *   (LTR) and HE (RTL) (issues #9, #10).
 * - The admin dashboard renders the corrected, instructor-excluded counts:
 *   exactly one student (issues #2, #3). Guarded behind instructor credentials.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const el = document.documentElement
    return el.scrollWidth - el.clientWidth
  })
  expect(overflow).toBeLessThanOrEqual(1)
}

/**
 * Navigates to the first course on the catalog. Returns the visited href, or
 * null when no courses are seeded (the caller then skips assertions).
 */
async function goToFirstCourse(
  page: Page,
  locale: "en" | "he"
): Promise<string | null> {
  await page.goto(`/${locale}`)
  await page
    .waitForFunction(
      () => {
        const catalog = document.getElementById("catalog")
        if (!catalog) return false
        if (catalog.querySelector("[aria-busy='true']")) return false
        return (
          catalog.querySelectorAll("a").length > 0 ||
          !!catalog.querySelector("[data-slot='empty-title']")
        )
      },
      { timeout: 15_000 }
    )
    .catch(() => null)

  const courseLink = page.locator(`a[href*="/${locale}/courses/"]`).first()
  if ((await courseLink.count()) === 0) return null
  const href = (await courseLink.getAttribute("href")) ?? null
  if (href) await page.goto(href)
  return href
}

const WIDTHS = [390, 768, 1280] as const
const LOCALES = ["en", "he"] as const

// ---------------------------------------------------------------------------
// Course page: no auto-scroll to the tutor on load (issue #4)
// ---------------------------------------------------------------------------

test.describe("course page auto-scroll guard", () => {
  for (const locale of LOCALES) {
    test(`${locale.toUpperCase()} course page stays scrolled to top on load`, async ({
      page,
    }) => {
      const href = await goToFirstCourse(page, locale)
      test.skip(href === null, "No courses seeded")

      // Give the page a beat for any mount effects (the old bug fired a smooth
      // scrollIntoView on the tutor anchor on first render).
      await page.waitForTimeout(1_000)

      const scrollY = await page.evaluate(() => window.scrollY)
      // The page must remain at (or within a hair of) the top; the tutor sits
      // far down the page, so an auto-scroll-to-tutor would push scrollY high.
      expect(scrollY).toBeLessThanOrEqual(1)
    })
  }
})

// ---------------------------------------------------------------------------
// Global chrome: header + footer no horizontal overflow (issues #9, #10)
// ---------------------------------------------------------------------------

test.describe("header and footer chrome - no overflow", () => {
  for (const locale of LOCALES) {
    for (const width of WIDTHS) {
      test(`${locale.toUpperCase()} home has no overflow at ${width}px`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 900 })
        await page.goto(`/${locale}`)

        // Header and footer landmarks are present.
        await expect(page.locator("header").first()).toBeVisible()
        await expect(page.locator("footer").first()).toBeVisible()

        // The footer no longer carries a brand logo image (issue #10): it only
        // links text. Confirm there is no <img> inside the footer.
        const footerImgCount = await page.locator("footer img").count()
        expect(footerImgCount).toBe(0)

        await expectNoHorizontalOverflow(page)
      })
    }
  }
})

// ---------------------------------------------------------------------------
// Admin dashboard corrected counts (issues #2, #3)
// ---------------------------------------------------------------------------

test.describe("admin dashboard corrected counts", () => {
  test.skip(
    !instructorCredentials.email || !instructorCredentials.password,
    "Skipped: E2E_INSTRUCTOR_EMAIL / E2E_INSTRUCTOR_PASSWORD not set"
  )

  test("admin dashboard shows the instructor-excluded student count", async ({
    page,
  }) => {
    await signIn(
      page,
      instructorCredentials.email!,
      instructorCredentials.password!
    )
    // Instructors land on the admin dashboard via the batch-24 role routing.
    await expect(page).toHaveURL(/\/en\/admin\/dashboard/, { timeout: 15_000 })

    // The overview stat cards render under the overview heading. Total Students
    // must exclude the instructor: with the seeded data that is exactly 1.
    const statList = page.getByRole("list", { name: /overview statistics/i })
    await expect(statList).toBeVisible({ timeout: 10_000 })

    const studentsCard = statList
      .getByRole("listitem")
      .filter({ hasText: /total students/i })
    // The card renders the label span then the value span; assert the value
    // (the last span) is exactly "1" - the single seeded student, instructor
    // excluded (issues #2, #3).
    await expect(studentsCard.locator("span").last()).toHaveText("1")
  })
})
