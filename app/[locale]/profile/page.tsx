import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"

import type { Locale } from "@/i18n/routing"
import { requireUser } from "@/lib/auth/require-user"
import { createClient } from "@/lib/supabase/server"
import {
  ensureProfile,
  updateAvatarForm,
  updateEmailForm,
  updateLocaleForm,
  updatePasswordForm,
  updateProfileForm,
} from "@/lib/profile/profile-actions"
import { resolveProfileMessage } from "@/lib/profile/resolve-profile-message"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select"
import { Separator } from "@/components/ui/separator"

/**
 * Localized, private metadata for the profile page. The tab title comes from the
 * `Profile.title` key so it matches the nav label and heading in each locale;
 * `robots` stays noindex/nofollow because this is an authenticated page.
 *
 * @param params - Route params (a Promise); carries the active locale.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Profile" })
  return {
    title: t("title"),
    robots: { index: false, follow: false },
  }
}

/**
 * User profile page (Batch 25). Any authenticated user - instructor or student -
 * edits their own details here. `requireUser()` redirects signed-out visitors to
 * the localized login page, so reaching the body proves a signed-in session.
 *
 * Five sections, each a Tier-2 no-JS `<form>` posting `FormData` to its server
 * action: contact details, email, password, avatar, and preferred language.
 * Every action redirects back here with a `?notice=`/`?error=` code that this
 * component resolves through the allowlist in `resolve-profile-message.ts` and
 * renders as a server-side banner, so feedback is visible with JavaScript
 * disabled and a forged query param never reflects arbitrary text. The avatar
 * file input is the only part that is not pure no-JS; the rest degrades cleanly.
 *
 * @param params - Route params (a Promise); carries the active locale.
 * @param searchParams - The page query (a Promise); carries the `notice`/`error`
 *   feedback codes set by the form actions' redirects.
 */
export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ notice?: string; error?: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale as Locale)

  // Authoritative auth guard; redirects (locale-preserving) when signed out.
  const userId = await requireUser()

  const supabase = await createClient()
  // getUser() is request-cached by @supabase/ssr, so this does not re-hit the
  // network after the guard. We need the row again here for the email and id.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // Guarantee a profile row exists for users created before this flow.
  await ensureProfile(userId)

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, avatar_url, locale")
    .eq("user_id", userId)
    .maybeSingle()

  const sp = await searchParams
  const t = await getTranslations("Profile")
  const notice = resolveProfileMessage(t, sp.notice)
  const error = resolveProfileMessage(t, sp.error)

  const fullName = profile?.full_name ?? ""
  const phone = profile?.phone ?? ""
  const avatarUrl = profile?.avatar_url ?? ""
  const currentLocale = profile?.locale === "he" ? "he" : "en"
  const email = user.email ?? ""

  return (
    <main
      id="main-content"
      className="flex flex-1 flex-col px-4 py-12 sm:py-16"
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {t("title")}
          </h1>
          <p className="text-pretty text-muted-foreground">{t("subtitle")}</p>
        </header>

        {notice ? (
          <p
            role="status"
            className="rounded-md bg-success px-4 py-3 text-sm text-success-foreground"
          >
            {notice}
          </p>
        ) : null}
        {error ? (
          <p
            role="alert"
            className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        {/* Contact details ---------------------------------------------- */}
        <section
          aria-labelledby="profile-contact-heading"
          className="flex min-w-0 flex-col gap-4"
        >
          <h2
            id="profile-contact-heading"
            className="text-xl font-semibold tracking-tight"
          >
            {t("contactTitle")}
          </h2>
          <form action={updateProfileForm} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="fullName">{t("fullNameLabel")}</Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                defaultValue={fullName}
                placeholder={t("fullNamePlaceholder")}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">{t("phoneLabel")}</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                defaultValue={phone}
                placeholder={t("phonePlaceholder")}
              />
            </div>
            <Button type="submit" className="self-start">
              {t("saveDetails")}
            </Button>
          </form>
        </section>

        <Separator />

        {/* Email -------------------------------------------------------- */}
        <section
          aria-labelledby="profile-email-heading"
          className="flex min-w-0 flex-col gap-4"
        >
          <h2
            id="profile-email-heading"
            className="text-xl font-semibold tracking-tight"
          >
            {t("emailTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("emailHint")}</p>
          <form action={updateEmailForm} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">{t("emailLabel")}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                defaultValue={email}
              />
            </div>
            <Button type="submit" className="self-start">
              {t("updateEmail")}
            </Button>
          </form>
        </section>

        <Separator />

        {/* Password ----------------------------------------------------- */}
        <section
          aria-labelledby="profile-password-heading"
          className="flex min-w-0 flex-col gap-4"
        >
          <h2
            id="profile-password-heading"
            className="text-xl font-semibold tracking-tight"
          >
            {t("passwordTitle")}
          </h2>
          <form action={updatePasswordForm} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="password">{t("newPasswordLabel")}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirmPassword">
                {t("confirmPasswordLabel")}
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
            <Button type="submit" className="self-start">
              {t("updatePassword")}
            </Button>
          </form>
        </section>

        <Separator />

        {/* Avatar ------------------------------------------------------- */}
        <section
          aria-labelledby="profile-avatar-heading"
          className="flex min-w-0 flex-col gap-4"
        >
          <h2
            id="profile-avatar-heading"
            className="text-xl font-semibold tracking-tight"
          >
            {t("avatarTitle")}
          </h2>
          {avatarUrl ? (
            // Public bucket URL renders directly; a plain <img> avoids a
            // next/image remote-domain allowlist and any signed-URL round trip.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={t("avatarCurrentAlt")}
              width={96}
              height={96}
              className="size-24 rounded-full border border-border object-cover"
            />
          ) : null}
          {/* No explicit encType/method: React sets multipart/form-data and
              POST automatically for a function action, and overrides any value
              set here (it warns otherwise). The file input still uploads. */}
          <form action={updateAvatarForm} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="avatar">{t("avatarLabel")}</Label>
              <Input
                id="avatar"
                name="avatar"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                required
              />
              <p className="text-xs text-muted-foreground">
                {t("avatarHint")}
              </p>
            </div>
            <Button type="submit" className="self-start">
              {t("uploadAvatar")}
            </Button>
          </form>
        </section>

        <Separator />

        {/* Locale ------------------------------------------------------- */}
        <section
          aria-labelledby="profile-locale-heading"
          className="flex min-w-0 flex-col gap-4"
        >
          <h2
            id="profile-locale-heading"
            className="text-xl font-semibold tracking-tight"
          >
            {t("localeTitle")}
          </h2>
          <form action={updateLocaleForm} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="locale">{t("localeLabel")}</Label>
              <NativeSelect
                id="locale"
                name="locale"
                defaultValue={currentLocale}
                className="w-full sm:w-64"
              >
                <NativeSelectOption value="en">
                  {t("localeEnglish")}
                </NativeSelectOption>
                <NativeSelectOption value="he">
                  {t("localeHebrew")}
                </NativeSelectOption>
              </NativeSelect>
            </div>
            <Button type="submit" className="self-start">
              {t("saveLocale")}
            </Button>
          </form>
        </section>
      </div>
    </main>
  )
}
