import { describe, expect, it } from "vitest"

import { catalogQuerySchema } from "@/lib/validation/catalog"

/**
 * Unit tests for the catalog query-param schema. Every field must be forgiving:
 * junk values coerce to defaults rather than throwing, because these come from
 * a hand-editable URL and the page must always render.
 */
describe("catalogQuerySchema", () => {
  it("applies defaults for an empty object", () => {
    const r = catalogQuerySchema.parse({})
    expect(r.q).toBeUndefined()
    expect(r.category).toBeUndefined()
    expect(r.sort).toBe("popular")
    expect(r.mine).toBe(false)
  })

  it("trims q and treats blank as undefined", () => {
    expect(catalogQuerySchema.parse({ q: "  react  " }).q).toBe("react")
    expect(catalogQuerySchema.parse({ q: "   " }).q).toBeUndefined()
  })

  it("accepts the three valid sorts", () => {
    expect(catalogQuerySchema.parse({ sort: "popular" }).sort).toBe("popular")
    expect(catalogQuerySchema.parse({ sort: "rated" }).sort).toBe("rated")
    expect(catalogQuerySchema.parse({ sort: "newest" }).sort).toBe("newest")
  })

  it("falls back to popular for an unknown sort (no throw)", () => {
    expect(catalogQuerySchema.parse({ sort: "bogus" }).sort).toBe("popular")
  })

  it("coerces mine to a boolean from query-string forms", () => {
    expect(catalogQuerySchema.parse({ mine: "1" }).mine).toBe(true)
    expect(catalogQuerySchema.parse({ mine: "true" }).mine).toBe(true)
    expect(catalogQuerySchema.parse({ mine: "0" }).mine).toBe(false)
    expect(catalogQuerySchema.parse({ mine: "anything" }).mine).toBe(false)
    expect(catalogQuerySchema.parse({}).mine).toBe(false)
  })

  it("keeps a category slug and blanks an empty one", () => {
    expect(catalogQuerySchema.parse({ category: "web-development" }).category).toBe(
      "web-development"
    )
    expect(catalogQuerySchema.parse({ category: "" }).category).toBeUndefined()
  })

  it("never throws on overlong q (caps and keeps the page rendering)", () => {
    // .max(200) would normally fail; .catch makes it fall back to undefined.
    const r = catalogQuerySchema.parse({ q: "x".repeat(500) })
    expect(r.q).toBeUndefined()
  })
})
