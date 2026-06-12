import { test, expect } from "@playwright/test"

/**
 * PWA primitives e2e. Asserts the manifest is valid and installable-shaped, the
 * service worker is served, and the localized offline fallback renders in both
 * locales. The `beforeinstallprompt` install button cannot be reliably forced
 * across Chromium versions, so it is not simulated here; the manifest + SW are
 * the installability contract.
 */

test.describe("PWA manifest", () => {
  test("/manifest.webmanifest is valid JSON with a name and an icon", async ({
    request,
  }) => {
    const res = await request.get("/manifest.webmanifest")
    expect(res.ok()).toBe(true)
    const manifest = await res.json()
    expect(manifest.name).toBeTruthy()
    expect(Array.isArray(manifest.icons)).toBe(true)
    expect(manifest.icons.length).toBeGreaterThan(0)
    // At least one 512 icon (Chromium installability requirement).
    expect(
      manifest.icons.some((i: { sizes?: string }) =>
        (i.sizes ?? "").includes("512"),
      ),
    ).toBe(true)
    expect(manifest.start_url).toBeTruthy()
  })
})

test.describe("PWA service worker", () => {
  test("/sw.js is served as JavaScript", async ({ request }) => {
    const res = await request.get("/sw.js")
    expect(res.ok()).toBe(true)
    const contentType = res.headers()["content-type"] ?? ""
    expect(contentType).toMatch(/javascript/i)
    const body = await res.text()
    expect(body).toContain("addEventListener")
  })
})

test.describe("PWA offline page", () => {
  test("the English offline page renders with a heading", async ({ page }) => {
    await page.goto("/en/offline")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(page.getByRole("main")).toBeVisible()
  })

  test("the Hebrew offline page is rtl", async ({ page }) => {
    await page.goto("/he/offline")
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  })
})
