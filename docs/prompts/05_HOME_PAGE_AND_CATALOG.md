# Prompt: Home Page And Course Catalog

```text
Use frontend-design, ui-ux-pro-max, and Magic MCP.

Build the public localized home page and course catalog for Eyal's Coding Academy using the existing project architecture.

Planning anchors:
- Task breakdown: docs/planning/TASK_BREAKDOWN.md, Tasks 4.1-4.3.
- Technical requirements: docs/planning/TECHNICAL_REQUIREMENTS.md,
  Sections 4, 8.1, 10, 11, 12, 15.
- Prompt map: docs/prompts/README.md.

Context:
- Do not rewrite existing layout, theme, localization, or auth foundations.
- The app uses next-intl under app/[locale]/ with EN/HE and RTL support.
- Courses must load from Supabase, not hard-coded component data.
- The UI must support light and dark themes, mobile screens, accessibility, and existing no-JS conventions.

Requirements:
1. Inspect the existing home page, layout, route groups, theme, and message catalog structure.
2. Build or update a professional home page with:
   - hero section
   - primary CTA
   - course catalog
   - why learn with Eyal section
   - trust/benefits section if it fits the current design
3. Build reusable course catalog components:
   - CourseCard
   - CourseCatalog
   - EnrollmentButton or CTA component
4. Each course card must show:
   - course title
   - description
   - level
   - lesson count
   - cover image or fallback visual
   - enrollment/continue action
5. Add loading, empty, and error states.
6. Add translations to English and Hebrew catalogs.
7. Ensure Hebrew RTL layout works.
8. Add localized SEO metadata for the public home page.
9. Add component tests for CourseCard and catalog empty state.
10. Update docs/planning/IMPLEMENTATION_LOG.md with any design and routing decisions.

Rules:
- Reuse existing shadcn/Base UI/Tailwind patterns.
- Adapt Magic MCP output to the existing design system instead of pasting inconsistent code.
- Do not break existing auth, theme, PWA, or localization.
- Keep client components minimal. Prefer server data loading where appropriate.
```
