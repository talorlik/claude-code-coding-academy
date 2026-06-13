import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { getSiteUrl } from "@/lib/utils/site-url"

describe("getSiteUrl", () => {
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL
    delete process.env.NEXT_PUBLIC_SITE_URL
  })

  afterEach(() => {
    if (originalAppUrl !== undefined) {
      process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
    } else {
      delete process.env.NEXT_PUBLIC_APP_URL
    }
    if (originalSiteUrl !== undefined) {
      process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl
    } else {
      delete process.env.NEXT_PUBLIC_SITE_URL
    }
  })

  it("returns NEXT_PUBLIC_APP_URL when set", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com"
    process.env.NEXT_PUBLIC_SITE_URL = "https://site.example.com"
    expect(getSiteUrl()).toBe("https://app.example.com")
  })

  it("falls back to NEXT_PUBLIC_SITE_URL when APP_URL is unset", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://site.example.com"
    expect(getSiteUrl()).toBe("https://site.example.com")
  })

  it("falls back to localhost:3000 when neither var is set", () => {
    expect(getSiteUrl()).toBe("http://localhost:3000")
  })
})
