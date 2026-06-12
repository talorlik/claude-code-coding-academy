import { type Page, expect } from "@playwright/test"

/**
 * Instructor credentials from the environment (seeded by `npm run seed`). The
 * authenticated check skips when these are unset, so the guest suite stays
 * deterministic in CI without secrets.
 */
export const instructorCredentials = {
  email: process.env.E2E_INSTRUCTOR_EMAIL,
  password: process.env.E2E_INSTRUCTOR_PASSWORD,
}

/**
 * Signs in through the real login form. Auth has no captcha in this project, so
 * a form login works end to end. Lands on `/[locale]/dashboard` on success.
 *
 * @param page - the Playwright page.
 * @param email - account email.
 * @param password - account password.
 */
export async function signIn(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/en/login")
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole("button", { name: /^sign in$/i }).click()
  await expect(page).toHaveURL(/\/en\/dashboard/, { timeout: 15_000 })
}
