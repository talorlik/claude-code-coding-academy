import { z } from "zod"

/**
 * Server-side validation schemas for the user profile page (Batch 25).
 *
 * These are the authoritative checks. HTML form attributes (`required`,
 * `minlength`, `accept`, the file-size hint) are a progressive-enhancement
 * nicety only; a client can strip them, so every constraint is re-enforced here
 * on the server. Each schema is intentionally strict (it rejects bad input)
 * rather than forgiving, because a profile write must not silently persist
 * garbage - unlike a hand-editable catalog URL, which coerces to defaults.
 */

/** Minimum password length; matches the signup/auth policy. */
export const MIN_PASSWORD_LENGTH = 8

/**
 * Upper bound on password length. Bounds the work the password hasher does on a
 * single request so a pathological input cannot tie it up.
 */
export const MAX_PASSWORD_LENGTH = 1000

/** Maximum avatar file size in bytes (2 MiB). */
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024

/**
 * Allowed avatar image MIME types. PNG, JPEG, WebP, and GIF cover the formats a
 * browser file picker yields for images; anything else (including a renamed
 * non-image) is rejected server-side regardless of the input's `accept`.
 */
export const ALLOWED_AVATAR_MIME = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const

/**
 * Contact-details schema: display name and phone. Both are optional (a user may
 * clear them), trimmed, and length-capped. `full_name` allows any printable
 * text; `phone` is a permissive free-text field (the profiles column is plain
 * text, with no country-code decomposition in this project).
 */
export const contactSchema = z.object({
  fullName: z.string().trim().max(120, "Name is too long.").optional(),
  phone: z.string().trim().max(40, "Phone number is too long.").optional(),
})

/** Validated contact-details input. */
export type ContactInput = z.infer<typeof contactSchema>

/**
 * Email-change schema. The address is trimmed and lower-cased before the format
 * check so the stored value is normalized and comparisons are case-insensitive.
 */
export const emailSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address."),
})

/** Validated email-change input. */
export type EmailInput = z.infer<typeof emailSchema>

/**
 * Password-change schema. Enforces the length bounds and that the confirmation
 * matches. The match is validated here because the client-side comparison never
 * runs with JavaScript disabled, so the server is the only guard.
 */
export const passwordSchema = z
  .object({
    password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, "Password must be at least 8 characters.")
      .max(MAX_PASSWORD_LENGTH, "Password is too long."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })

/** Validated password-change input. */
export type PasswordInput = z.infer<typeof passwordSchema>

/**
 * Supported UI locales. Mirrors the `profiles.locale` column check constraint
 * (`'en' | 'he'`); next-intl maps `en` -> `en-US` and `he` -> `he-IL`.
 */
export const localeSchema = z.object({
  locale: z.enum(["en", "he"]),
})

/** Validated locale-change input. */
export type LocaleInput = z.infer<typeof localeSchema>

/**
 * Avatar metadata schema, validating the uploaded file's declared MIME type and
 * size. The actual bytes are streamed to storage separately; this guards the
 * metadata before the upload so an oversized or non-image file is rejected
 * cheaply and server-side, not trusted from the input's `accept` attribute.
 */
export const avatarSchema = z.object({
  type: z
    .string()
    .refine(
      (t): t is (typeof ALLOWED_AVATAR_MIME)[number] =>
        (ALLOWED_AVATAR_MIME as readonly string[]).includes(t),
      "Choose a PNG, JPEG, WebP, or GIF image."
    ),
  size: z
    .number()
    .int()
    .positive("Choose an image file.")
    .max(MAX_AVATAR_BYTES, "Image must be 2 MB or smaller."),
})

/** Validated avatar metadata. */
export type AvatarInput = z.infer<typeof avatarSchema>
