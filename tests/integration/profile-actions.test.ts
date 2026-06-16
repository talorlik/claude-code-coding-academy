/**
 * Integration tests for the profile FormData server-action wrappers in
 * lib/profile/profile-actions.ts.
 *
 * The Supabase client, auth, and storage are mocked - no live DB or network.
 * Each test asserts the feedback CODE the wrapper redirects with (the contract
 * the profile page resolves through the allowlist), covering both the success
 * notice and the distinct error codes per form.
 *
 * The i18n `redirect` is mocked to THROW (like the real next-intl redirect,
 * which signals by throwing), so exactly one redirect fires per action and the
 * code after it does not run. Each call awaits the action inside a try/catch and
 * reads the recorded redirect argument.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

// ---------------------------------------------------------------------------
// Mock the i18n redirect (throws, recording its argument) and the locale.
// ---------------------------------------------------------------------------
const redirectArg = vi.fn()
vi.mock("@/i18n/navigation", () => ({
  redirect: (args: { href: string; locale: string }) => {
    redirectArg(args)
    throw new Error("REDIRECT")
  },
}))

vi.mock("next-intl/server", () => ({
  getLocale: vi.fn().mockResolvedValue("en"),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Mock the Supabase server client. Knobs let each test steer auth/db/storage.
// ---------------------------------------------------------------------------
let mockUser: { id: string; email: string } | null = { id: "user-1", email: "a@b.com" }
let upsertError: { message: string } | null = null
let authUpdateError: { message: string } | null = null
let uploadError: { message: string } | null = null

type Builder = {
  upsert: (..._args: unknown[]) => Builder
  then: (resolve: (v: unknown) => unknown) => Promise<unknown>
}

function makeBuilder(): Builder {
  const builder: Builder = {
    upsert: () => builder,
    then: (resolve) => Promise.resolve(resolve({ data: null, error: upsertError })),
  }
  return builder
}

const createClient = vi.fn(async () => ({
  auth: {
    getUser: vi.fn().mockImplementation(() =>
      Promise.resolve({ data: { user: mockUser } })
    ),
    updateUser: vi.fn().mockImplementation(() =>
      Promise.resolve({ data: {}, error: authUpdateError })
    ),
  },
  from: () => makeBuilder(),
  storage: {
    from: () => ({
      upload: vi.fn().mockImplementation(() =>
        Promise.resolve({ data: {}, error: uploadError })
      ),
      getPublicUrl: () => ({
        data: { publicUrl: "https://example.test/avatars/user-1/avatar.png" },
      }),
    }),
  },
}))

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => createClient(),
}))

const {
  updateProfileForm,
  updateEmailForm,
  updatePasswordForm,
  updateAvatarForm,
  updateLocaleForm,
} = await import("@/lib/profile/profile-actions")

/** Builds a FormData with the given fields. */
function form(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

/** Runs an action, swallowing the thrown REDIRECT, and returns the redirect arg. */
async function run(
  action: (fd: FormData) => Promise<void>,
  fd: FormData
): Promise<{ href: string; locale: string }> {
  try {
    await action(fd)
  } catch (e) {
    if (!(e instanceof Error) || e.message !== "REDIRECT") throw e
  }
  return redirectArg.mock.calls.at(-1)?.[0]
}

beforeEach(() => {
  redirectArg.mockClear()
  mockUser = { id: "user-1", email: "a@b.com" }
  upsertError = null
  authUpdateError = null
  uploadError = null
})

// ---------------------------------------------------------------------------
// Contact details
// ---------------------------------------------------------------------------
describe("updateProfileForm", () => {
  it("redirects with notice=detailsSaved on success", async () => {
    const arg = await run(updateProfileForm, form({ fullName: "Ada", phone: "555" }))
    expect(arg).toEqual({ href: "/profile?notice=detailsSaved", locale: "en" })
  })

  it("redirects with error=saveFailed on a db error", async () => {
    upsertError = { message: "boom" }
    const arg = await run(updateProfileForm, form({ fullName: "Ada" }))
    expect(arg).toEqual({ href: "/profile?error=saveFailed", locale: "en" })
  })
})

// ---------------------------------------------------------------------------
// Email
// ---------------------------------------------------------------------------
describe("updateEmailForm", () => {
  it("redirects with notice=emailConfirmSent on success", async () => {
    const arg = await run(updateEmailForm, form({ email: "new@example.com" }))
    expect(arg).toEqual({
      href: "/profile?notice=emailConfirmSent",
      locale: "en",
    })
  })

  it("redirects with error=invalidEmail for a malformed address", async () => {
    const arg = await run(updateEmailForm, form({ email: "nope" }))
    expect(arg).toEqual({ href: "/profile?error=invalidEmail", locale: "en" })
  })

  it("redirects with error=emailUpdateFailed on an auth error", async () => {
    authUpdateError = { message: "boom" }
    const arg = await run(updateEmailForm, form({ email: "new@example.com" }))
    expect(arg).toEqual({
      href: "/profile?error=emailUpdateFailed",
      locale: "en",
    })
  })
})

// ---------------------------------------------------------------------------
// Password
// ---------------------------------------------------------------------------
describe("updatePasswordForm", () => {
  it("redirects with notice=passwordUpdated on success", async () => {
    const arg = await run(
      updatePasswordForm,
      form({ password: "longenough", confirmPassword: "longenough" })
    )
    expect(arg).toEqual({ href: "/profile?notice=passwordUpdated", locale: "en" })
  })

  it("redirects with error=passwordsDoNotMatch on a mismatch", async () => {
    const arg = await run(
      updatePasswordForm,
      form({ password: "longenough", confirmPassword: "different" })
    )
    expect(arg).toEqual({
      href: "/profile?error=passwordsDoNotMatch",
      locale: "en",
    })
  })

  it("redirects with error=passwordTooShort for a short password", async () => {
    const arg = await run(
      updatePasswordForm,
      form({ password: "short", confirmPassword: "short" })
    )
    expect(arg).toEqual({
      href: "/profile?error=passwordTooShort",
      locale: "en",
    })
  })

  it("redirects with error=passwordUpdateFailed on an auth error", async () => {
    authUpdateError = { message: "boom" }
    const arg = await run(
      updatePasswordForm,
      form({ password: "longenough", confirmPassword: "longenough" })
    )
    expect(arg).toEqual({
      href: "/profile?error=passwordUpdateFailed",
      locale: "en",
    })
  })
})

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------
describe("updateAvatarForm", () => {
  /** Builds a FormData carrying a fake image File under the `avatar` key. */
  function avatarForm(type: string, bytes: number): FormData {
    const fd = new FormData()
    const file = new File([new Uint8Array(bytes)], "a.png", { type })
    fd.set("avatar", file)
    return fd
  }

  it("redirects with notice=avatarUpdated on success", async () => {
    const arg = await run(updateAvatarForm, avatarForm("image/png", 1024))
    expect(arg).toEqual({ href: "/profile?notice=avatarUpdated", locale: "en" })
  })

  it("redirects with error=invalidAvatar when no file is provided", async () => {
    const arg = await run(updateAvatarForm, form({}))
    expect(arg).toEqual({ href: "/profile?error=invalidAvatar", locale: "en" })
  })

  it("redirects with error=invalidAvatar for a non-image type", async () => {
    const arg = await run(updateAvatarForm, avatarForm("application/pdf", 1024))
    expect(arg).toEqual({ href: "/profile?error=invalidAvatar", locale: "en" })
  })

  it("redirects with error=avatarUploadFailed when storage rejects", async () => {
    uploadError = { message: "boom" }
    const arg = await run(updateAvatarForm, avatarForm("image/png", 1024))
    expect(arg).toEqual({
      href: "/profile?error=avatarUploadFailed",
      locale: "en",
    })
  })
})

// ---------------------------------------------------------------------------
// Locale
// ---------------------------------------------------------------------------
describe("updateLocaleForm", () => {
  it("redirects into the chosen locale with notice=localeUpdated on success", async () => {
    const arg = await run(updateLocaleForm, form({ locale: "he" }))
    expect(arg).toEqual({ href: "/profile?notice=localeUpdated", locale: "he" })
  })

  it("redirects with error=invalidLocale for an unsupported locale", async () => {
    const arg = await run(updateLocaleForm, form({ locale: "fr" }))
    expect(arg).toEqual({ href: "/profile?error=invalidLocale", locale: "en" })
  })

  it("redirects with error=localeUpdateFailed on a db error", async () => {
    upsertError = { message: "boom" }
    const arg = await run(updateLocaleForm, form({ locale: "he" }))
    expect(arg).toEqual({
      href: "/profile?error=localeUpdateFailed",
      locale: "en",
    })
  })
})
