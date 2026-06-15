/**
 * Unit tests for the theme-aware <Logo /> brand component.
 *
 * The light/dark swap is pure CSS (driven by the `data-logo` rules in
 * globals.css against an ancestor `.light`/`.dark` class), so jsdom - which
 * applies no stylesheet - cannot observe visibility. These tests instead assert
 * the contract the CSS depends on: both variants render into the DOM with the
 * correct `data-logo` marker and the same localized alt text, the component
 * contributes no heading, and the alt resolves from the `Brand` namespace in
 * both catalogs. The e2e theme suite is the proof that the visual swap works.
 *
 * `next/image` is mocked to a plain <img> because the real component pulls in
 * the Next image runtime, which is unavailable in the jsdom environment.
 */

import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"

import enMessages from "@/messages/en-US.json"
import heMessages from "@/messages/he-IL.json"

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    width,
    height,
    priority: _priority,
    ...rest
  }: {
    src: string
    alt: string
    width?: number
    height?: number
    priority?: boolean
    [key: string]: unknown
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={width} height={height} {...rest} />
  ),
}))

// Static import AFTER mocks.
import { Logo } from "@/components/logo"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function wrap(ui: React.ReactNode, locale = "en", messages = enMessages) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {ui}
    </NextIntlClientProvider>
  )
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Logo", () => {
  it("renders both theme variants into the DOM", () => {
    const { container } = render(wrap(<Logo />))
    const light = container.querySelector('[data-logo="light"]')
    const dark = container.querySelector('[data-logo="dark"]')
    expect(light).not.toBeNull()
    expect(dark).not.toBeNull()
    expect(light?.getAttribute("src")).toBe("/brand/logo_light.png")
    expect(dark?.getAttribute("src")).toBe("/brand/logo_dark.png")
  })

  it("gives both variants the localized alt text (English)", () => {
    render(wrap(<Logo />))
    const images = screen.getAllByAltText(enMessages.Brand.logoAlt)
    // One per theme variant; both carry the same accessible name so the visible
    // one always announces correctly regardless of theme.
    expect(images).toHaveLength(2)
  })

  it("resolves the alt from the Brand namespace in Hebrew too", () => {
    render(wrap(<Logo />, "he", heMessages))
    const images = screen.getAllByAltText(heMessages.Brand.logoAlt)
    expect(images).toHaveLength(2)
  })

  it("contributes no heading (it is not an <h1> or any heading)", () => {
    render(wrap(<Logo />))
    expect(screen.queryByRole("heading")).toBeNull()
  })

  it("derives height from the intrinsic 4:3 aspect ratio for a given width", () => {
    const { container } = render(wrap(<Logo width={200} />))
    const light = container.querySelector('[data-logo="light"]')
    // 200 * (1086 / 1448) = 150 (rounded).
    expect(light?.getAttribute("width")).toBe("200")
    expect(light?.getAttribute("height")).toBe("150")
  })

  it("forwards a custom className to the wrapper", () => {
    const { container } = render(wrap(<Logo className="custom-logo" />))
    expect(container.querySelector(".custom-logo")).not.toBeNull()
  })
})
