import { getTranslations } from "next-intl/server"

import { submitContactMessage } from "@/lib/contact/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

/**
 * Public contact form (Batch 16). A Tier-2 no-JS form: a real `<form>` posting
 * to the {@link submitContactMessage} server action, native `<label for>` fields,
 * and a `type="submit"` button, so it works with scripting disabled. Feedback is
 * delivered out of band through the `?notice=`/`?error=` channel resolved by the
 * page; this component renders the resolved banner above the fields.
 *
 * Server-rendered (no client island) - the only interactivity is the native form
 * submit. Fully responsive: a single-column stack on narrow screens, fields grow
 * to the container width, and the submit row wraps.
 *
 * @param props.errorMessage - Localized error banner text, or `null`/absent.
 * @param props.noticeMessage - Localized success banner text, or `null`/absent.
 */
export async function ContactForm({
  errorMessage,
  noticeMessage,
}: {
  errorMessage?: string | null
  noticeMessage?: string | null
}) {
  const t = await getTranslations("Contact.form")

  return (
    <form
      action={submitContactMessage}
      className="flex w-full min-w-0 flex-col gap-4"
      noValidate
    >
      {errorMessage ? (
        <p
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}
      {noticeMessage ? (
        <p
          className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400"
          role="status"
        >
          {noticeMessage}
        </p>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="contact-name">{t("nameLabel")}</Label>
        <Input
          id="contact-name"
          name="name"
          type="text"
          autoComplete="name"
          required
          maxLength={100}
          placeholder={t("namePlaceholder")}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="contact-email">{t("emailLabel")}</Label>
        <Input
          id="contact-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          placeholder={t("emailPlaceholder")}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="contact-message">{t("messageLabel")}</Label>
        <Textarea
          id="contact-message"
          name="message"
          required
          minLength={10}
          maxLength={2000}
          rows={5}
          placeholder={t("messagePlaceholder")}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" className="min-w-0">
          {t("submit")}
        </Button>
      </div>
    </form>
  )
}
