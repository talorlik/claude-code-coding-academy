import { test, expect, type Page } from "@playwright/test"

import { instructorCredentials, signIn } from "./helpers/auth"

/**
 * Batch 22 theme-surface-sweep visual contract. The sweep removed every Tailwind
 * named-color literal from app surfaces in favor of DESIGN.md semantic tokens.
 * This spec guards that contract three ways:
 *
 * 1. No swept, guest-reachable surface emits a `green-*`/`red-*`/`yellow-*`/
 *    `emerald-*`/`amber-*` literal class anywhere in its rendered DOM (a
 *    regression net for the whole sweep, not just one page).
 * 2. Those surfaces hold up at the three reference viewports in EN (LTR) and HE
 *    (RTL) with no horizontal overflow, and the theme toggle flips `.light`/
 *    `.dark` on an inner page (not just the home route).
 * 3. The admin reminders status pills - the prompt's named hot spot - carry no
 *    green/red/yellow literal class. Authenticated, so it skips without creds,
 *    matching `responsive.spec.ts`.
 *
 * The literal scan keys off the original swept palettes; it does NOT forbid the
 * brand `accent`/`success` tokens (those are class names like `text-brand-accent`,
 * never `*-amber-400`).
 */

/** The three reference widths: mobile, tablet, desktop. */
const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
] as const

/** Guest-reachable surfaces the sweep touched (catalog renders the CourseCard
 *  star rating; home renders the hero + newest-courses cards). */
const SWEPT_GUEST_PAGES = [
  { name: "home", en: "/en", he: "/he" },
  { name: "courses", en: "/en/courses", he: "/he/courses" },
] as const

/** The Tailwind named-color families the sweep removed from app surfaces. */
const FORBIDDEN_COLOR_FAMILIES = [
  "green",
  "red",
  "yellow",
  "emerald",
  "amber",
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

/**
 * Collects every `class` token in the document that matches a removed named-color
 * family at a numeric shade (e.g. `bg-green-50`, `dark:text-red-200`,
 * `fill-amber-400`). Returns the offending tokens so a failure names them.
 */
async function findForbiddenColorClasses(
  page: Page,
  families: readonly string[],
): Promise<string[]> {
  return page.evaluate((fams) => {
    // Match `<prefix>-<family>-<shade>`, allowing a `dark:`/`hover:` variant and
    // a utility prefix (bg/text/border/fill/...). The trailing digit is what
    // distinguishes a Tailwind palette shade from a token like `text-success`.
    const pattern = new RegExp(`-(?:${fams.join("|")})-\\d`)
    const hits = new Set<string>()
    for (const el of Array.from(document.querySelectorAll<HTMLElement>("*"))) {
      for (const token of Array.from(el.classList)) {
        if (pattern.test(token)) hits.add(token)
      }
    }
    return Array.from(hits)
  }, families)
}

test.describe("theme surface sweep - no named-color literals", () => {
  for (const target of SWEPT_GUEST_PAGES) {
    test(`${target.name} (EN) renders no removed color literal`, async ({
      page,
    }) => {
      await page.goto(target.en)
      await expect(page.getByRole("main")).toBeVisible()
      const hits = await findForbiddenColorClasses(
        page,
        FORBIDDEN_COLOR_FAMILIES,
      )
      expect(hits, `forbidden color classes on ${target.en}`).toEqual([])
    })
  }
})

test.describe("theme surface sweep - responsive + RTL", () => {
  for (const vp of VIEWPORTS) {
    for (const target of SWEPT_GUEST_PAGES) {
      test(`${target.name} has no overflow at ${vp.name} in EN and HE`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height })

        await page.goto(target.en)
        await expect(page.getByRole("banner")).toBeVisible()
        await expectNoHorizontalOverflow(page)

        await page.goto(target.he)
        await expect(page.locator("html")).toHaveAttribute("dir", "rtl")
        await expectNoHorizontalOverflow(page)
      })
    }
  }
})

test.describe("theme surface sweep - theme toggle on an inner page", () => {
  test("the catalog toggles light <-> dark and persists", async ({ page }) => {
    await page.goto("/en/courses")
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

test.describe("theme surface sweep - admin reminders pills", () => {
  test("status pills carry no green/red/yellow literal class", async ({
    page,
  }) => {
    const { email, password } = instructorCredentials
    test.skip(
      !email || !password,
      "E2E_INSTRUCTOR_EMAIL / E2E_INSTRUCTOR_PASSWORD not set",
    )
    await signIn(page, email!, password!)
    await page.goto("/en/admin/reminders")
    await expect(page.getByRole("main")).toBeVisible()

    const hits = await findForbiddenColorClasses(
      page,
      FORBIDDEN_COLOR_FAMILIES,
    )
    expect(hits, "forbidden color classes on /en/admin/reminders").toEqual([])
  })
})
