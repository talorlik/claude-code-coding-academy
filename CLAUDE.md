# Project Conventions

## Localization (English + Hebrew)

This project fully supports English and Hebrew and that support must be carried
through all future work. Before adding any user-facing UI, read `docs/I18N.md`.

Non-negotiables:

- New pages live under `app/[locale]/` (not `app/` root). `app/api/*` and
  `app/auth/*` are the only non-localized trees.
- No hardcoded user-facing strings. Use `getTranslations`/`useTranslations` and
  add every key to BOTH `messages/en-US.json` and `messages/he-IL.json`.
- Catalogs must stay key-identical; `npm run lint:i18n` (run in `prebuild`)
  fails the build otherwise.
- Use the `@/i18n/navigation` helpers instead of `next/link` /
  `next/navigation` inside the app tree.
- Hebrew is RTL: prefer Tailwind logical utilities so layout mirrors correctly.
