import { test, expect, type Page } from "@playwright/test"

/**
 * E2e for the Batch 19 course-detail additions: the public review list, the
 * enrollment-gated review form, and the in-course lesson search. All assertions
 * run as an anonymous visitor (no auth seeding needed): the review list and
 * lesson search are public, and the review form must be ABSENT for anyone not
 * signed-in-and-enrolled. No horizontal overflow at the three reference widths
 * in EN (LTR) and HE (RTL).
 */

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
] as const

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const el = document.documentElement
    return el.scrollWidth - el.clientWidth
  })
  expect(overflow).toBeLessThanOrEqual(1)
}

/** Discovers the first course slug from the catalog, or null if none seeded. */
async function getFirstCourseSlug(page: Page): Promise<string | null> {
  await page.goto("/en/courses")
  const link = page.locator('a[href*="/courses/"]').first()
  if ((await link.count()) === 0) return null
  const href = await link.getAttribute("href")
  const match = href?.match(/\/courses\/([^/?#]+)/)
  return match?.[1] ?? null
}

test.describe("course detail: reviews + lesson search (anonymous)", () => {
  test("review list and lesson search are public; review form is gated out", async ({
    page,
  }) => {
    const slug = await getFirstCourseSlug(page)
    test.skip(!slug, "No courses in the catalog - run npm run seed first")

    await page.goto(`/en/courses/${slug}`)
    await expect(page.getByRole("main")).toBeVisible()

    // Public: the reviews section and the lesson search are present.
    await expect(
      page.getByRole("heading", { name: /^reviews$/i })
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { name: /find a lesson/i })
    ).toBeVisible()
    await expect(
      page.getByLabel(/search lessons in this course/i)
    ).toBeVisible()

    // Gated: an anonymous visitor must NOT see the write form's submit button.
    await expect(
      page.getByRole("button", { name: /submit review/i })
    ).toHaveCount(0)
  })

  test("the lesson search filters the in-course lesson list", async ({
    page,
  }) => {
    const slug = await getFirstCourseSlug(page)
    test.skip(!slug, "No courses in the catalog - run npm run seed first")

    await page.goto(`/en/courses/${slug}`)
    const search = page.getByLabel(/search lessons in this course/i)
    await expect(search).toBeVisible()

    // A query that matches nothing collapses the list to the no-results note.
    await search.fill("zzzzzzzzzz-no-such-lesson")
    await expect(page.getByText(/no lessons match/i)).toBeVisible()

    // Clearing restores the list (no-results note gone).
    await search.fill("")
    await expect(page.getByText(/no lessons match/i)).toHaveCount(0)
  })

  for (const vp of VIEWPORTS) {
    for (const locale of ["en", "he"] as const) {
      test(`${locale} course detail has no horizontal overflow at ${vp.name} (${vp.width}px)`, async ({
        page,
      }) => {
        const slug = await getFirstCourseSlug(page)
        test.skip(!slug, "No courses in the catalog - run npm run seed first")

        await page.setViewportSize({ width: vp.width, height: vp.height })
        await page.goto(`/${locale}/courses/${slug}`)
        await expect(page.getByRole("banner")).toBeVisible()
        await expect(page.locator("html")).toHaveAttribute(
          "dir",
          locale === "he" ? "rtl" : "ltr"
        )
        await expectNoHorizontalOverflow(page)
      })
    }
  }
})
