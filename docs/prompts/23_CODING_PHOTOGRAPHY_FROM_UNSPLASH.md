# Prompt: Coding Photography From Unsplash

```text
Source the curated coding photos from Unsplash, self-host them, and place them
on scoped surfaces (course covers as a fallback, course-detail headers, About,
Contact, an optional auth side panel) as content media with theme-token framing
and required photographer attribution. The home hero is NEVER touched - it stays
header_banner.png.

Planning anchors:
- Design spec: docs/superpowers/specs/2026-06-15-DESIGN_SYSTEM_UX_OVERHAUL_DESIGN.md (Batch 23, Decision 12).
- Page/UI conventions: docs/I18N.md, docs/ACCESSIBILITY.md, docs/RESPONSIVE.md.
- Cross-batch state: the academy-build-state memory and docs/planning/IMPLEMENTATION_LOG.md.

Context:
- DESIGN.md forbids photography; the user has explicitly overridden that for
  this batch. Photos are scoped (see placements) and treated as content media,
  exempt from the palette-only rule; their frame/overlay/caption still use
  theme tokens.
- The course field for a cover image is coverImageUrl (DB cover_image_url).
  components/courses/course-card.tsx already branches
  course.coverImageUrl ? <img src={course.coverImageUrl}> : <fallback> - this
  batch fills the existing else branch with the Unsplash fallback. A real
  coverImageUrl always wins.
- Pages exist at app/[locale]/about/page.tsx, app/[locale]/contact/page.tsx,
  app/[locale]/login/page.tsx, app/[locale]/register/page.tsx, and
  app/[locale]/courses/[courseSlug]/page.tsx. about/page.tsx already imports
  next/image. next.config.mjs has an empty config; local images need no
  remotePatterns.
- The seven curated FREE Unsplash photos (not Unsplash+). Save each to
  public/images/unsplash/<localName>.jpg via
  https://unsplash.com/photos/<id>/download?force=true. Stable CDN URL is
  https://images.unsplash.com/<cdnFile>. Source page:
  https://unsplash.com/s/photos/coding.

  localName        | id          | cdnFile                              | photographer      | profile                       | slot
  code-monitor     | OqtafYT5kTw | photo-1461749280684-dccba630e2f6     | Ilya Pavlov       | unsplash.com/@ilyapavlov      | course cover fallback; About header
  html-lines       | 4hbJ-eymZ1o | photo-1542831371-29b0f74f9713        | Florian Olivo     | unsplash.com/@florianolv      | course cover fallback
  screen-code      | ieic5Tq8YMk | photo-1515879218367-8466d910aaa4     | Florian Olivo     | unsplash.com/@florianolv      | course cover fallback
  monitor-code     | LrxSl4ZxoRs | photo-1607705703571-c5a8695f18f6     | Mohammad Rahmani  | unsplash.com/@afgprogrammer   | course-detail header
  laptop-colorcode | 8qEB0fTe9Vw | photo-1607799279861-4dd421887fb3     | Mohammad Rahmani  | unsplash.com/@afgprogrammer   | auth side panel
  macbook-code     | f77Bh3inUpE | photo-1555066931-4365d14bab8c        | Arnold Francisca  | unsplash.com/@clark_fransa    | Contact header
  matrix-code      | iar-afB0QQw | photo-1526374965328-7f61d4dc18c5     | Markus Spiske     | unsplash.com/@markusspiske    | course cover fallback (dark-leaning)

Requirements:
1. Add scripts/fetch-unsplash-images.mjs: a committed, idempotent Node script
   that downloads the seven photos above to public/images/unsplash/<localName>.jpg
   using the .../download?force=true URLs (skip files that already exist; fail
   loudly with a non-zero exit on any download error). Run it during the batch so
   the files land in the worktree, and COMMIT the resulting .jpg files
   (self-hosted, offline/PWA-safe).
2. Add lib/images/unsplash.ts: a typed, exported map from localName to
   { src, photographer, profileUrl, unsplashUrl, altKey } (src points at the
   local public path; unsplashUrl is https://unsplash.com/photos/<id>). TSDoc on
   the exported type and map. This is the single source of truth for attribution.
3. Add components/unsplash-image.tsx exporting <UnsplashImage />: wraps
   next/image; applies the theme-token frame (border var(--color-border),
   --radius-cards or --radius-large-blocks) and a low-opacity theme scrim/overlay
   (built from var(--color-bg) / var(--color-accent)) so any overlaid text meets
   WCAG AA in BOTH themes; renders the localized alt and a visible credit line
   "Photo by {photographer} on Unsplash" linking to the photographer profile and
   to Unsplash. A decorative-only placement may pass alt="" and surface the
   credit in a nearby consolidated line instead. Server-component friendly and
   no-JS safe (next/image degrades to <img>).
4. Placements:
   - components/courses/course-card.tsx: in the EXISTING coverImageUrl else
     branch, render the deterministic Unsplash fallback - pick a cover-eligible
     photo (code-monitor, html-lines, screen-code, matrix-code) by hashing the
     course id or slug so a given course always shows the same photo (stable,
     test-friendly). A real coverImageUrl still wins.
   - app/[locale]/courses/[courseSlug]/page.tsx: a framed header photo
     (monitor-code) with a theme scrim behind/beside the title, ONLY when the
     course has no coverImageUrl.
   - app/[locale]/about/page.tsx: one coding photo (code-monitor), framed, with
     attribution.
   - app/[locale]/contact/page.tsx: one coding photo (macbook-code), framed,
     with attribution.
   - app/[locale]/login/page.tsx and app/[locale]/register/page.tsx: an optional
     decorative photo column (laptop-colorcode) shown only on md+ (hidden below
     md so it never crowds the mobile form), with a consolidated credit line.
5. The home hero is out of scope and must not change: do NOT add a photo to
   app/[locale]/page.tsx; the hero stays header_banner.png (spec Decision 7).
6. Mobile-first and RTL: photos and their frames must not cause horizontal
   overflow at 390/768/1280 in EN (LTR) and HE (RTL); the auth side panel is
   hidden below md; use min-w-0, object-cover, intrinsic or fill sizing with an
   aspect ratio to avoid layout shift, and logical RTL utilities. Follow
   docs/RESPONSIVE.md.
7. Add an Imagery namespace to BOTH messages/en-US.json and messages/he-IL.json,
   key-identical: a localized alt string per photo and an attribution template
   "Photo by {name} on Unsplash".
8. TSDoc on lib/images/unsplash.ts and <UnsplashImage />.
9. Tests:
   - Unit: the deterministic cover-fallback selector returns the same photo for
     the same course id/slug, and a course WITH coverImageUrl renders its own
     image (no fallback).
   - A test asserting every photo in the unsplash map has attribution fields and
     an altKey that exists in BOTH catalogs.
   - e2e: the About, Contact, and (md+) auth photos render with a visible credit
     line; no page overflows at 390/768/1280 in EN and HE. Mock network; the
     committed files satisfy the build even if the run environment is offline.
   - For any mocked Supabase access use the working { ...builder } pattern with
     then:(resolve:(v:unknown)=>unknown), NOT a strict index signature.
   - Run typecheck to its exit code; do not trust a tail of the log.
10. Update docs/planning/IMPLEMENTATION_LOG.md and the academy-build-state memory.

Rules:
- Photos are content media (exempt from the palette-only rule), but their frame,
  scrim, caption, and attribution line use DESIGN.md theme tokens, and any text
  overlaid on a photo meets WCAG AA in both themes.
- The home hero is NEVER an Unsplash photo; it stays header_banner.png. Photos
  appear only on the surfaces listed in Requirement 4.
- A real course coverImageUrl always wins over the Unsplash fallback.
- Only FREE Unsplash photos, self-hosted under public/images/unsplash/; no
  runtime hotlinking to the Unsplash CDN and no Unsplash API at runtime.
- Render the required photographer + Unsplash attribution wherever a photo
  appears (inline credit or a consolidated nearby line).
- No hardcoded user-facing strings; everything through getTranslations in BOTH
  catalogs.
- Run npm run lint, npm run lint:i18n, npm run typecheck, npm run build, npm
  test, and npm run test:e2e. All gates must exit 0.
- Worktree is a sibling ../academy-23-unsplash-imagery, branch
  feature/23-unsplash-imagery; squash-merge into local main when green. After
  the squash-merge, run git diff --name-only HEAD~1 HEAD -- package.json
  package-lock.json; if either changed, run npm install in the primary checkout
  before any gate, and rm -rf .next if route types are stale.
```
