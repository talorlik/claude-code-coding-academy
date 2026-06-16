# Prompt Directory

Use these prompts with Claude Code one batch at a time. Do not ask Claude Code
to build the entire application in one prompt.

Before running any prompt, open:

1. `docs/planning/TASK_BREAKDOWN.md` for the task range and acceptance checks.
2. `docs/planning/TECHNICAL_REQUIREMENTS.md` for implementation constraints.
3. The prompt file listed below.

Recommended order:

| Order | Prompt File | Task Range | Technical Sections |
| --- | --- | --- | --- |
| 1 | `00_VERIFY_EXISTING_IMPLEMENTATION.md` | Tasks 0.1-0.5 | Sections 1, 2, 3, 4, 5, 11, 12, 13, 15, 16, 17 |
| 2 | `01_PLANNING_ALIGNMENT_AND_TEST_HARNESS.md` | Tasks 1.1-1.3 | Sections 1, 2, 14, 15, 17 |
| 3 | `02_DATABASE_SCHEMA_AND_RLS.md` | Tasks 2.1-2.5 | Sections 5, 6, 7, 15, 16 |
| 4 | `03_DOMAIN_TYPES_VALIDATION_AND_DATA_ACCESS.md` | Tasks 3.1, 3.2, 3.4, 3.5 | Sections 6.3, 6.4, 8, 14, 15 |
| 5 | `04_YOUTUBE_PARSER_AND_METADATA.md` | Task 3.3 | Sections 5, 6.3, 8.2, 9.4, 14, 15 |
| 6 | `05_HOME_PAGE_AND_CATALOG.md` | Tasks 4.1-4.3 | Sections 4, 8.1, 10, 11, 12, 15 |
| 7 | `06_COURSE_PAGE_AND_PROGRESS.md` | Tasks 5.1-5.5 | Sections 4, 6.3, 8, 9.1, 9.2, 10, 11, 15 |
| 8 | `07_ADMIN_COURSE_MANAGEMENT.md` | Tasks 6.1-6.6 | Sections 4, 7, 9.3, 9.4, 10, 11, 15 |
| 9 | `08_AI_TUTOR_CONTEXT_AND_PERSISTENCE.md` | Tasks 7.1-7.4 | Sections 5, 6.3, 8, 9.5, 10, 11, 14, 15 |
| 10 | `09_DASHBOARDS.md` | Tasks 8.1-8.4 | Sections 6.4, 8, 10, 11, 15 |
| 11 | `10_LOCALIZATION_SEO_ACCESSIBILITY_POLISH.md` | Tasks 9.1-9.5 | Sections 10, 11, 12, 13, 15, 17 |
| 12 | `11_REQUIRED_EXTENDED_FEATURES.md` | Tasks 10.1-10.5 | Sections 6.2.1, 6.3, 6.4, 7, 8, 9.1, 10, 11, 14, 15 |
| 13 | `12_TESTING_AND_QA.md` | Tasks 11.1-11.3 | Sections 15, 17 |
| 14 | `13_DEPLOYMENT_AND_FINAL_REVIEW.md` | Tasks 12.1-12.3 | Sections 5, 16, 17 |
| 15 | `14_YOUTUBE_PLAYLIST_IMPORT_LIVE.md` | Post-build add-on | Sections 5, 9.4 |
| 16 | `15_REMINDER_EMAIL_DELIVERY_SMTP.md` | Post-build add-on | Sections 10, 14 |
| 17 | `16_ABOUT_AND_CONTACT_PAGES.md` | Content pages | Sections 4, 10, 11, 12, 15 |
| 18 | `17_CATALOG_SCHEMA_CATEGORIES_AND_REVIEWS.md` | Catalog data | Sections 5, 6, 7, 15, 16 |
| 19 | `18_COURSES_CATALOG_PAGE.md` | Catalog UI | Sections 4, 8, 10, 11, 12, 15 |
| 20 | `19_COURSE_REVIEWS_AND_LESSON_SEARCH.md` | Reviews + search | Sections 6.3, 8, 10, 11, 15 |
| 21 | `20_DESIGN_TOKENS_FONTS_AND_BRAND_ASSETS.md` | Design tokens + assets | Sections 4, 10, 11, 12, 15 |
| 22 | `21_HOME_HERO_AND_GLOBAL_CHROME.md` | Hero + chrome | Sections 4, 10, 11, 12, 15 |
| 23 | `22_THEME_SURFACE_SWEEP_AND_POLISH.md` | Surface sweep | Sections 4, 10, 11, 12, 15 |
| 24 | `23_CODING_PHOTOGRAPHY_FROM_UNSPLASH.md` | Unsplash photos | Sections 4, 10, 11, 12, 15 |
| 25 | `24_AUTH_ROUTING_COUNT_FIXES_AND_CHROME.md` | Routing + counts + chrome | Sections 4, 6.4, 7, 10, 11, 15 |
| 26 | `25_USER_PROFILE_PAGE.md` | User profile page | Sections 4, 6.3, 10, 11, 12, 15 |
| 27 | `26_ADMIN_USER_MANAGEMENT.md` | Admin user management | Sections 4, 7, 10, 11, 15 |
| 28 | `27_ABOUT_CONTENT_AND_CONTACT_MAPS.md` | About content + Contact maps | Sections 4, 10, 11, 12, 15 |
| 29 | `28_GITHUB_PAGES_LANDING_SITE.md` | GitHub Pages landing site (static, in /docs) | DESIGN.md (static; outside the app build) |

The catalog/content batches (16-20 above) are backed by the design spec at
`docs/superpowers/specs/2026-06-14-courses-catalog-and-content-pages-design.md`.

The design-system & UX/UI batches (21-24 above, prompt files 20-23) are backed
by `docs/superpowers/specs/2026-06-15-DESIGN_SYSTEM_UX_OVERHAUL_DESIGN.md` and
the style reference `docs/design/DESIGN.md`. The home hero always uses
`header_banner.png`; Unsplash photos (prompt 23) never replace it.

The admin/profile/fixes batches (25-28 above, prompt files 24-27, batches 24-27)
are backed by
`docs/superpowers/specs/2026-06-16-ADMIN_PROFILE_FIXES_AND_USER_MANAGEMENT_DESIGN.md`
and the plan
`docs/superpowers/plans/2026-06-16-admin-profile-fixes-and-user-management.md`.
For these, the prompt-file number equals the batch number (no offset). Run them
in order 24 -> 25 -> 26 -> 27.

Batch 28 (prompt file `28_GITHUB_PAGES_LANDING_SITE.md`) is a standalone STATIC
GitHub Pages landing site under `docs/` (plain HTML/CSS/JS, English only,
light+dark, built to `docs/design/DESIGN.md`). It is NOT part of the Next.js
app, is independent of batches 24-27, and is not covered by the app gate set -
verify it as a static site. Run it any time.

Rule: after every prompt, run the verification commands and commit a stable
checkpoint before moving to the next prompt.
