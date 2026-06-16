import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Mail, MapPin, Phone, Clock } from "lucide-react"

import { ContactForm } from "@/components/contact/contact-form"
import { UnsplashImage } from "@/components/unsplash-image"
import { resolveContactMessage } from "@/lib/contact/resolve-contact-message"
import type { Locale } from "@/i18n/routing"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "Contact" })

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      locale,
    },
  }
}

/**
 * Public Contact page (Batch 16, map upgraded in Batch 27).
 *
 * Renders a fake Tel-Aviv contact block (a Rothschild Blvd address, an
 * Israeli-format phone number, an email, and opening hours - all placeholder/
 * demo values, see docs/planning/IMPLEMENTATION_LOG.md), a Google Maps Embed
 * region, and the Tier-2 no-JS {@link ContactForm}.
 *
 * The map (Batch 27) renders a Maps Embed API iframe when
 * `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY` is set, querying the displayed
 * address; the key is public by necessity (it rides in the iframe `src`) and is
 * secured by HTTP-referrer + API-scope restriction in Google Cloud, so it is a
 * PLAIN (not Sensitive) env var. When the key is ABSENT the page falls back to
 * the original labelled placeholder box rather than a broken iframe, so CI and
 * any secret-less environment stay green.
 *
 * Feedback for the form arrives via the `?notice=`/`?error=` query-param
 * channel, resolved here through the allowlist in `resolve-contact-message.ts`
 * so a forged query param never reflects arbitrary text into the page (mirrors
 * the auth message channel).
 *
 * Server component: one `<main id="main-content">`, one `<h1>`, semantic
 * `<section>`/`<address>` landmarks. Mobile-first and RTL-safe via Tailwind
 * logical utilities; the two-column layout collapses to a single column below
 * `md`.
 */
export default async function ContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ error?: string; notice?: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale as Locale)

  const sp = await searchParams
  const t = await getTranslations("Contact")
  const tMessages = await getTranslations("Contact.messages")

  const errorMessage = resolveContactMessage(tMessages, sp.error)
  const noticeMessage = resolveContactMessage(tMessages, sp.notice)

  // Maps Embed API src, built only when the (public, referrer-restricted) key is
  // present. The displayed address is the query; both are URL-encoded. An absent
  // key leaves this null so the page renders the placeholder box instead of a
  // broken iframe - keeping secret-less environments green.
  const mapsEmbedKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_API_KEY
  const mapSrc = mapsEmbedKey
    ? `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(
        mapsEmbedKey,
      )}&q=${encodeURIComponent(t("addressValue"))}`
    : null

  return (
    <main id="main-content" className="flex flex-1 flex-col px-4 py-12 sm:py-16">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {t("title")}
        </h1>
        <p className="max-w-2xl text-pretty text-muted-foreground">
          {t("subtitle")}
        </p>

        {/* Contact header photo (Batch 23): a framed, attributed Unsplash coding
            photo. Content media; the frame + credit use theme tokens. */}
        <UnsplashImage
          name="macbook-code"
          className="mt-6"
          rounded="rounded-[var(--radius-large-blocks)]"
          aspect="aspect-[16/6]"
          sizes="(max-width: 1024px) 100vw, 1024px"
          priority
        />

        <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Details + map ------------------------------------------------ */}
          <section
            aria-labelledby="contact-details-heading"
            className="flex min-w-0 flex-col gap-6"
          >
            <h2
              id="contact-details-heading"
              className="text-xl font-semibold tracking-tight"
            >
              {t("detailsTitle")}
            </h2>

            {/* All values are fake/demo data - do not treat as real. */}
            <address className="flex flex-col gap-4 text-sm not-italic text-muted-foreground">
              <span className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-5 shrink-0" aria-hidden />
                <span className="min-w-0 break-words">{t("addressValue")}</span>
              </span>
              <span className="flex items-start gap-3">
                <Phone className="mt-0.5 size-5 shrink-0" aria-hidden />
                <a
                  href="tel:+972312345678"
                  className="min-w-0 break-words hover:underline"
                >
                  {t("phoneValue")}
                </a>
              </span>
              <span className="flex items-start gap-3">
                <Mail className="mt-0.5 size-5 shrink-0" aria-hidden />
                <a
                  href="mailto:hello@example.com"
                  className="min-w-0 break-words hover:underline"
                >
                  {t("emailValue")}
                </a>
              </span>
              <span className="flex items-start gap-3">
                <Clock className="mt-0.5 size-5 shrink-0" aria-hidden />
                <span className="min-w-0 break-words">{t("hoursValue")}</span>
              </span>
            </address>

            {/*
              MAP (Batch 27): a Google Maps Embed API iframe when the public
              key is configured; otherwise the original labelled placeholder box
              so no broken iframe (and no network call) appears without a key.
            */}
            {mapSrc ? (
              <iframe
                title={t("mapTitle")}
                src={mapSrc}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
                className="aspect-video w-full min-w-0 rounded-xl border border-border"
              />
            ) : (
              <div
                className="flex aspect-video w-full min-w-0 items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 text-center text-sm text-muted-foreground"
                role="img"
                aria-label={t("mapAlt")}
              >
                {t("mapPlaceholder")}
              </div>
            )}
          </section>

          {/* Form --------------------------------------------------------- */}
          <section
            aria-labelledby="contact-form-heading"
            className="flex min-w-0 flex-col gap-6"
          >
            <h2
              id="contact-form-heading"
              className="text-xl font-semibold tracking-tight"
            >
              {t("formTitle")}
            </h2>
            <ContactForm
              errorMessage={errorMessage}
              noticeMessage={noticeMessage}
            />
          </section>
        </div>
      </div>
    </main>
  )
}
