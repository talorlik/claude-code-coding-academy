"use server"

import { revalidatePath } from "next/cache"
import { getLocale } from "next-intl/server"

import { redirect } from "@/i18n/navigation"
import { createClient } from "@/lib/supabase/server"
import type { ActionResult } from "@/lib/types/action-result"
import { fail, ok } from "@/lib/types/action-result"
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  avatarSchema,
  contactSchema,
  emailSchema,
  localeSchema,
  passwordSchema,
} from "@/lib/validation/profile"

/**
 * Locale-relative path the form wrappers redirect back to. The next-intl
 * `redirect` helper prefixes the active locale (`/en/profile`, `/he/profile`).
 */
const PROFILE_PATH = "/profile"

/**
 * Supported profile locales. Mirrors the `profiles.locale` column check
 * (`'en' | 'he'`); next-intl maps `en` -> `en-US` and `he` -> `he-IL`.
 */
type ProfileLocale = "en" | "he"

/**
 * Ensures a `profiles` row exists for the given user, creating an empty one if
 * absent. Idempotent. Called after authentication so every signed-in user has a
 * profile to edit. Failures are swallowed: a missing profile must never block
 * sign-in.
 */
export async function ensureProfile(userId: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from("profiles")
    .upsert(
      { user_id: userId },
      { onConflict: "user_id", ignoreDuplicates: true }
    )
}

/**
 * Updates the current user's saved contact details (display name and phone).
 * Validated server-side and written only to the caller's own row (RLS enforces
 * `auth.uid() = user_id`). Both fields are optional; a blank value clears the
 * column.
 *
 * @param input - The submitted `fullName` and `phone` (free text).
 */
export async function updateProfile(input: {
  fullName?: string
  phone?: string
}): Promise<ActionResult<null>> {
  const parsed = contactSchema.safeParse(input)
  if (!parsed.success) {
    return fail("Could not save your details.", { fullName: "Invalid." })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail("You must be signed in.")

  const { error } = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      // Normalize blank input to null so the column clears rather than stores
      // an empty string.
      full_name: parsed.data.fullName || null,
      phone: parsed.data.phone || null,
    },
    { onConflict: "user_id" }
  )

  if (error) return fail("Could not save your details.")

  // The profile page is locale-prefixed; revalidate the dynamic route so each
  // locale's cached render refreshes.
  revalidatePath("/[locale]/profile", "page")
  return ok(null)
}

/**
 * Changes the current user's email via Supabase Auth. Triggers a confirmation
 * email to the new address; the change takes effect only after the user clicks
 * the link (handled by the existing `/auth/confirm` route).
 *
 * @param email - The requested new email address.
 */
export async function updateEmail(email: string): Promise<ActionResult<null>> {
  const parsed = emailSchema.safeParse({ email })
  if (!parsed.success) {
    return fail("Enter a valid email address.", { email: "Invalid email." })
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ email: parsed.data.email })
  if (error) return fail("Could not update your email.")

  return ok(null)
}

/**
 * Changes the current user's password via Supabase Auth. Requires an active
 * session. Enforces the length policy shared with signup; the confirm-match is
 * checked by the form wrapper before this runs.
 */
export async function updatePassword(
  password: string
): Promise<ActionResult<null>> {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return fail("Password must be at least 8 characters.", {
      password: "Too short.",
    })
  }
  // Upper bound so a pathological input cannot tie up the password hasher.
  if (password.length > MAX_PASSWORD_LENGTH) {
    return fail("Password is too long.", { password: "Too long." })
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return fail("Could not update your password.")

  return ok(null)
}

/**
 * Uploads a new avatar image to the public-read `avatars` bucket under the
 * user's own `{user_id}/` prefix and stores its public URL in
 * `profiles.avatar_url`. The MIME type and size are validated server-side
 * before the upload, so a non-image or oversized file never reaches storage.
 *
 * The object key is namespaced by user id, matching the bucket's RLS, and uses
 * a fixed `avatar` basename with `upsert: true` so each user keeps a single
 * avatar object that is replaced in place.
 *
 * @param file - The uploaded image (a web `File` from the FormData).
 */
export async function updateAvatar(
  file: File
): Promise<ActionResult<{ avatarUrl: string }>> {
  const parsed = avatarSchema.safeParse({ type: file.type, size: file.size })
  if (!parsed.success) {
    return fail("Choose a valid image (PNG, JPEG, WebP, or GIF; max 2 MB).", {
      avatar: "Invalid file.",
    })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail("You must be signed in.")

  // Derive the stored extension from the validated MIME type, not the original
  // filename, so the object key is predictable and the content type honest.
  const extension = mimeToExtension(file.type)
  const objectKey = `${user.id}/avatar.${extension}`

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(objectKey, file, {
      contentType: file.type,
      upsert: true,
    })
  if (uploadError) return fail("Could not upload your avatar.")

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(objectKey)

  // Append a cache-busting query so a replaced avatar (same object key) is not
  // served from a stale browser/CDN cache.
  const cacheBustedUrl = `${publicUrl}?v=${Date.now()}`

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(
      { user_id: user.id, avatar_url: cacheBustedUrl },
      { onConflict: "user_id" }
    )
  if (profileError) return fail("Could not save your avatar.")

  revalidatePath("/[locale]/profile", "page")
  return ok({ avatarUrl: cacheBustedUrl })
}

/**
 * Maps a validated avatar MIME type to a file extension for the object key.
 * Only the allowlisted types reach this; the default is a defensive fallback.
 */
function mimeToExtension(mime: string): string {
  switch (mime) {
    case "image/png":
      return "png"
    case "image/jpeg":
      return "jpg"
    case "image/webp":
      return "webp"
    case "image/gif":
      return "gif"
    default:
      return "img"
  }
}

/**
 * Switches the current user's preferred locale (`profiles.locale`). Validated
 * against the supported set and written only to the caller's own row.
 *
 * @param locale - The requested locale (`'en'` or `'he'`).
 */
export async function updateLocale(
  locale: string
): Promise<ActionResult<{ locale: ProfileLocale }>> {
  const parsed = localeSchema.safeParse({ locale })
  if (!parsed.success) {
    return fail("Unsupported language.", { locale: "Invalid." })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return fail("You must be signed in.")

  const { error } = await supabase
    .from("profiles")
    .upsert(
      { user_id: user.id, locale: parsed.data.locale },
      { onConflict: "user_id" }
    )
  if (error) return fail("Could not change your language.")

  revalidatePath("/[locale]/profile", "page")
  return ok({ locale: parsed.data.locale })
}

// ---------------------------------------------------------------------------
// FormData wrappers (Tier-2 no-JS server actions)
// ---------------------------------------------------------------------------
// Each wrapper reads from FormData and ends in a next-intl `redirect` carrying
// a `?notice=`/`?error=` code. Reading FormData and redirecting is what lets the
// form submit and report a result with JavaScript disabled: the browser POSTs
// natively, the server handles it, and the page re-renders with a localized
// banner driven by the code. With JS present React re-runs the same action over
// fetch, so the behavior is identical. The redirect is the final statement on
// every branch and is never wrapped in try/catch: next-intl's `redirect`
// signals by throwing, so catching it would swallow the navigation.

/**
 * FormData wrapper around {@link updateProfile}, bound to the contact-details
 * form. Reads `fullName` and `phone`.
 */
export async function updateProfileForm(formData: FormData): Promise<void> {
  const locale = await getLocale()
  const result = await updateProfile({
    fullName: String(formData.get("fullName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
  })

  if (result.ok) {
    redirect({ href: `${PROFILE_PATH}?notice=detailsSaved`, locale })
  }
  redirect({ href: `${PROFILE_PATH}?error=saveFailed`, locale })
}

/**
 * FormData wrapper around {@link updateEmail}, bound to the email form. A
 * malformed address is reported distinctly from an auth-layer failure so the
 * banner copy is specific. Reads `email`.
 */
export async function updateEmailForm(formData: FormData): Promise<void> {
  const locale = await getLocale()
  const result = await updateEmail(String(formData.get("email") ?? ""))

  if (result.ok) {
    redirect({ href: `${PROFILE_PATH}?notice=emailConfirmSent`, locale })
  } else {
    const code = result.fieldErrors?.email ? "invalidEmail" : "emailUpdateFailed"
    redirect({ href: `${PROFILE_PATH}?error=${code}`, locale })
  }
}

/**
 * FormData wrapper around {@link updatePassword}, bound to the password form.
 * The confirm-password match is re-checked here because the client-side check
 * never runs with JavaScript disabled. Reads `password` and `confirmPassword`.
 */
export async function updatePasswordForm(formData: FormData): Promise<void> {
  const locale = await getLocale()
  const password = String(formData.get("password") ?? "")
  const confirmPassword = String(formData.get("confirmPassword") ?? "")

  const validation = passwordSchema.safeParse({ password, confirmPassword })
  if (!validation.success) {
    // Distinguish a mismatch from a length failure so the banner is specific.
    const mismatch = validation.error.issues.some((issue) =>
      issue.path.includes("confirmPassword")
    )
    const code = mismatch ? "passwordsDoNotMatch" : "passwordTooShort"
    redirect({ href: `${PROFILE_PATH}?error=${code}`, locale })
  }

  const result = await updatePassword(password)

  if (result.ok) {
    redirect({ href: `${PROFILE_PATH}?notice=passwordUpdated`, locale })
  } else {
    const code = result.fieldErrors?.password
      ? "passwordTooShort"
      : "passwordUpdateFailed"
    redirect({ href: `${PROFILE_PATH}?error=${code}`, locale })
  }
}

/**
 * FormData wrapper around {@link updateAvatar}, bound to the avatar form. The
 * file input is the one part of the page that is not pure no-JS (a file upload
 * needs the picker); the rest of the page degrades gracefully without it. Reads
 * the `avatar` file. A missing or empty submission is reported as an
 * invalid-avatar error rather than silently succeeding.
 */
export async function updateAvatarForm(formData: FormData): Promise<void> {
  const locale = await getLocale()
  const file = formData.get("avatar")

  if (!(file instanceof File) || file.size === 0) {
    redirect({ href: `${PROFILE_PATH}?error=invalidAvatar`, locale })
  }

  const result = await updateAvatar(file as File)

  if (result.ok) {
    redirect({ href: `${PROFILE_PATH}?notice=avatarUpdated`, locale })
  } else {
    const code = result.fieldErrors?.avatar
      ? "invalidAvatar"
      : "avatarUploadFailed"
    redirect({ href: `${PROFILE_PATH}?error=${code}`, locale })
  }
}

/**
 * FormData wrapper around {@link updateLocale}, bound to the language form. On
 * success the redirect targets the chosen locale so the page (and the rest of
 * the app) immediately switches into it. Reads `locale`.
 */
export async function updateLocaleForm(formData: FormData): Promise<void> {
  const current = await getLocale()
  const requested = String(formData.get("locale") ?? "")
  const result = await updateLocale(requested)

  if (result.ok) {
    // Redirect into the newly chosen locale, not the current one, so the switch
    // takes effect on the same navigation.
    redirect({
      href: `${PROFILE_PATH}?notice=localeUpdated`,
      locale: result.data.locale,
    })
  } else {
    const code = result.fieldErrors?.locale
      ? "invalidLocale"
      : "localeUpdateFailed"
    redirect({ href: `${PROFILE_PATH}?error=${code}`, locale: current })
  }
}
