# Prompt: Verify Existing Implementation Before Building

Use this as Task 0 before implementing any new feature.

```text
You are working inside an existing Next.js course-platform project. Do not rewrite the project. First verify what already exists, how it was implemented, and why it was likely implemented that way.

Context:
- The project is for Eyal's Coding Academy, an online course platform and AI tutor.
- The current stack is Next.js 16.1.7 App Router, React 19.2.4, TypeScript 5.9, ESM, Tailwind CSS 4, shadcn 4, Base UI, Lucide, next-themes, Recharts, next-intl, Supabase, Vercel AI SDK, Cloudflare Turnstile, Vitest, Testing Library, and Playwright.
- Existing features include template installation, /start-from-template, /setup-vercel-ai, /setup-github, /setup-vercel, Supabase clients, environment variables, auth flows, responsive behavior, accessibility/no-JS support, PWA, EN/HE localization, RTL, light/dark theme, Skills, and MCPs.

Task:
1. Inspect the repository structure.
2. Inspect package.json, scripts, dependencies, and config files.
3. Verify app routing structure, especially app/[locale]/.
4. Verify next-intl setup, message catalogs, and RTL handling.
5. Verify Supabase server, browser, and admin clients.
6. Verify auth flows: sign up, login, logout, remember me, forgot password, session refresh.
7. Verify existing /api/chat implementation and Vercel AI Gateway usage.
8. Verify Cloudflare Turnstile wiring.
9. Verify theme switching.
10. Verify PWA manifest/service worker setup.
11. Verify accessibility and no-JS conventions.
12. Verify testing setup for Vitest, Testing Library, jsdom, and Playwright.
13. Verify .gitignore protects .env.local and MCP/token files.
14. Verify environment variable names are present without printing secret values.
15. Create or update docs/planning/IMPLEMENTATION_LOG.md with:
   - What already exists.
   - How it is implemented.
   - Why it should be preserved.
   - Any defects or risks.
   - Recommended conventions for new work.

Rules:
- Do not expose secrets.
- Do not modify working features unless you find a blocking defect.
- Do not start building the course platform features yet.
- Prefer evidence from files over assumptions.
- End with exact verification commands to run.
```
