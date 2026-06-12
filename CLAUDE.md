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

## Git

Per-branch worktree off clean `main` -> gates pass -> squash-merge into local
`main` -> remove worktree. NEVER push `main` (a push triggers the production
Vercel deploy); feature branches may be pushed. See the global
`~/.claude/CLAUDE.md` for the full worktree model.

Dependency reconcile after squash-merge: immediately after squash-merging a
worktree into local `main`, check whether the squash changed `package.json` or
`package-lock.json` (e.g. `git diff --name-only HEAD~1 HEAD -- package.json
package-lock.json`). If either changed, run `npm install` in the primary `main`
checkout before running any gate. The worktree installs its deps in isolation,
so a new or upgraded package exists only in the worktree's `node_modules` until
this step; skipping it leaves `main` with a manifest that references packages
that are not installed, and the next `typecheck`/`build` fails with
"Cannot find module ...". `node_modules` is gitignored, so this never affects a
commit. Also clear a stale `.next/` (`rm -rf .next`) before re-running gates if
routes moved, since cached route types can reference deleted paths.
