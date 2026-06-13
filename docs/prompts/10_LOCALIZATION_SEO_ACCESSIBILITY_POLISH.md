# Prompt: Localization, SEO, Accessibility, PWA, And Product Polish

```text
Use frontend-design and ui-ux-pro-max.

Review and polish Eyal's Coding Academy as a production-like SaaS product.

Planning anchors:
- Task breakdown: docs/planning/TASK_BREAKDOWN.md, Tasks 9.1-9.5.
- Technical requirements: docs/planning/TECHNICAL_REQUIREMENTS.md,
  Sections 10, 11, 12, 13, 15, 17.
- Prompt map: docs/prompts/README.md.

Context:
- Existing EN/HE localization, RTL, light/dark theme, PWA, accessibility, no-JS support, and responsive behavior must be preserved.
- Main features should already be implemented before this prompt is used.

Tasks:
1. Review all new UI for visual consistency with the existing design system.
2. Complete missing EN/HE translations.
3. Remove hard-coded user-visible strings from new components.
4. Verify RTL layout for Hebrew pages.
5. Add or improve SEO metadata for public home and course pages.
6. Ensure private dashboard and admin pages are noindex.
7. Review accessibility:
   - heading structure
   - form labels
   - field error associations
   - focus states
   - keyboard navigation
   - modal/drawer behavior
   - color contrast
   - YouTube iframe title
8. Review mobile responsiveness across:
   - home/catalog
   - course learning page
   - tutor chat
   - admin course management
   - student dashboard
   - teacher dashboard
9. Improve loading states with skeletons where appropriate.
10. Improve empty states for no courses, no lessons, no enrollments, no progress, no tutor messages, and no admin analytics.
11. Improve error states for Supabase, YouTube, AI, and auth failures.
12. Confirm PWA behavior is not broken and authenticated data is not cached unsafely.
13. Confirm no secrets are referenced in client code.
14. Update docs/planning/IMPLEMENTATION_LOG.md with final polish decisions.

Rules:
- Do not redesign the product from scratch.
- Do not break working flows to improve appearance.
- Keep all changes incremental and test after each area.
```
