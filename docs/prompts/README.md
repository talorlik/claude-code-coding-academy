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

The catalog/content batches (16-20 above) are backed by the design spec at
`docs/superpowers/specs/2026-06-14-courses-catalog-and-content-pages-design.md`.

Rule: after every prompt, run the verification commands and commit a stable
checkpoint before moving to the next prompt.
