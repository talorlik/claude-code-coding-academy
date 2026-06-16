# Eyal's Coding Academy

A bilingual (English + Hebrew) online learning platform where students follow
structured, video-based programming courses with an AI tutor available inside
every lesson. It is a complete, production-ready application built on the
**AI Game Changer Vibe Coding template**
(**Next.js + shadcn/ui + Supabase + Vercel AI Gateway**), and it also serves as
the reference app and starting point for building your own.

> This project is distributed privately through the AI Game Changer platform.
> To install, visit [game-changer.brainai.co.il/template](https://game-changer.brainai.co.il/template)
> and receive a personal installation command. Direct `git clone` from GitHub is
> not supported.


## What Is Eyal's Coding Academy

Eyal's Coding Academy was built for students who want more than scattered
tutorials and generic explanations. It brings professional programming
instruction, organized course paths, progress tracking, and AI-powered support
together in one focused learning platform - from first steps in HTML and CSS,
through JavaScript and React, to Vibe Coding with AI tools.

It is a real, working product, not a toy demo. Every feature below is
implemented, tested (Vitest unit/integration + Playwright E2E), and deployable
to production.

### What Students Get

- **Structured video courses** - each course is a clear progression of lessons
  with YouTube-hosted video, organized so students always know what to watch
  next.
- **A course catalog** - browse, search, and filter published courses by
  category, popularity, rating, or recency; enroll in free or (simulated) paid
  courses.
- **Progress tracking** - per-lesson completion, course progress bars, a
  personal dashboard, and a printable certificate on completion.
- **An in-context AI tutor** - a chat tutor embedded in each lesson that uses
  the current course and lesson context to explain concepts and unblock the
  student, rather than acting as a generic chatbot.
- **Reviews and ratings** - enrolled students can rate and review the courses
  they take.

### What Instructors Get

- **An admin area** to create and manage courses and lessons, including bulk
  lesson import from a YouTube playlist.
- **A teacher dashboard** with enrollment, completion, and engagement counts.
- **User management** - invite users, assign roles, disable, or remove accounts.
- **Student groups and re-engagement reminders** delivered over email.

### Built In From the Start

- **Bilingual + RTL** - full English and Hebrew, with right-to-left layout for
  Hebrew. UI strings live in synced message catalogs; no hardcoded text.
- **Accessible and progressively enhanced** - semantic landmarks, the core
  forms work without JavaScript, and `jsx-a11y` is enforced in CI.
- **Responsive** - no horizontal overflow at mobile, tablet, or desktop widths,
  verified by the E2E suite.
- **Installable PWA** with an offline fallback page.
- **Two roles** - `instructor` and `student` - enforced with Supabase
  row-level security.

> [!NOTE]
> Payments are **simulation-only** - there is no real card processing or
> payment provider wired in. The checkout flow demonstrates the enrollment path
> without moving money.


## Getting Started

> The correct way to start a new project is always these two steps - together,
> in this order, without skipping. Everything beyond this (AI, GitHub, Vercel)
> is optional and added afterward as needed.


### Step 1 - Copy the Template and Install

> The script will ask you for a project name and folder location. No editing
> needed before running.

**Windows - PowerShell** (open as Administrator):

```powershell
$f="$env:TEMP\gc-install.ps1"; irm "https://raw.githubusercontent.com/RanNahmany/game-changer-app-template/main/scripts/install-windows.ps1" -OutFile $f; & $f; Remove-Item $f -ErrorAction SilentlyContinue
```

**Mac / Linux:**

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/RanNahmany/game-changer-app-template/main/scripts/install-mac.sh)
```

The script will ask:

1. **Project name** - lowercase English, hyphens, no spaces
2. **Folder location** - choose from three options:
   - `Desktop/projects` (default)
   - `C:\projects`
   - Custom path

<details>
<summary>What does the script do?</summary>

- Creates the target folder based on your choice
- Clones the template into a folder with your chosen name
- Clears the template's git history
- Initializes a fresh git repo in your name
- Installs dependencies
- Creates `.env.local` from `.env.example`
- Installs the Vercel plugin for Claude Code
- Creates the first commit

</details>


### Step 2 - Configure the Project in Claude Code (Required)

After the script finishes, open Claude Code inside the project folder and run:

```bash
/start-from-template
```

> [!WARNING]
> Do not skip this step. Without it there is no Supabase, no database, no
> auth - the project simply will not work.

This command runs an interactive setup that connects:

1. **Supabase** - using the new 2026 API keys (`publishable` + `secret`), not
   the legacy ones
2. **Supabase MCP** - gives Claude Code direct access to your database
3. **Initial home page** - something nice to start with

Once both steps are done, you are ready to code. Everything below is optional.


## Optional Add-ons

After the two required steps, add what you need when you need it.

### Add AI to the Project

```bash
/setup-vercel-ai
```

Connects **Vercel AI Gateway** - unified access to Claude, GPT, Gemini, and all
models, with **$5 free credit every month**. Includes installing `ai` +
`@ai-sdk/gateway`, creating a chat route, and optionally a shadcn chat UI.

### Deploy to Production (GitHub to Vercel with CI/CD)

Built-in deploy path: **every `git push` to `main` triggers an automatic
production deploy**.

**Step A - GitHub:**

```bash
/setup-github
```

- Creates a repository on GitHub (public or private)
- Pushes the code and connects `origin`
- Requires the `gh` CLI (`brew install gh` and `gh auth login`)

**Step B - Vercel:**

```bash
/setup-vercel
```

- Connects the project to Vercel and GitHub
- Syncs environment variables (including Supabase keys)
- Updates Redirect URLs in Supabase for production
- Triggers the first deploy via `git push`

> [!WARNING]
> `/setup-github` must run **before** `/setup-vercel` - without a GitHub repo
> there is no CI/CD.

After setup:

- `git push origin main` - production deploy
- `git push origin <branch>` - automatic preview deploy for every branch/PR


## Stack and Tooling

The Academy is built on the AI Game Changer Vibe Coding template, which ships
the following foundation. When you install from the template, this is what you
start with.

### Stack

- **Next.js** (App Router + Turbopack)
- **Tailwind CSS** + **shadcn/ui** + **Base UI**
- **next-themes** - dark mode ready
- **Recharts** - charts
- **Sonner** - toasts
- **date-fns** + **react-day-picker**
- **Embla Carousel**, **Vaul** (drawers), **CMDK** (command palette)

### Claude Code Integration

- **Skills** installed: `shadcn`, and more (see `.agents/skills/`)
- **MCP-ready** - pre-configured for Supabase MCP and Context7
- **Slash commands** - `/start-from-template` for init, `/setup-vercel-ai` for
  AI integration

### Code Quality

- **TypeScript** strict mode
- **ESLint** (flat config, jsx-a11y enforced) + **Prettier** +
  **prettier-plugin-tailwindcss**
- i18n catalog sync enforced at build time (`npm run lint:i18n`)
- Playwright E2E suite for responsive, RTL, and accessibility contracts


## Available Scripts

| Script | What it does |
|--------|--------------|
| `npm run setup` | First-time project bootstrap (run once) |
| `npm run dev` | Dev server with Turbopack |
| `npm run build` | Production build |
| `npm run start` | Run the production build locally |
| `npm run lint` | ESLint (jsx-a11y enforced) |
| `npm run lint:i18n` | Verify translation catalogs are key-identical |
| `npm run format` | Format code with Prettier |
| `npm run typecheck` | TypeScript check without building |
| `npm run seed` | Create instructor + student users for development |
| `npm run test:e2e` | Playwright - responsive, RTL, accessibility |


## Environment Variables

`.env.local` is created automatically by `npm run setup`; values are filled in
by `/start-from-template`.

```env
# Supabase - new 2026 keys, not the legacy anon/service_role keys
# Dashboard -> Project Settings -> API Keys -> "Publishable and secret API keys"
NEXT_PUBLIC_SUPABASE_URL=                  # https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=      # sb_publishable_...  (safe for browser)
SUPABASE_SECRET_KEY=                       # sb_secret_...       (server only)

# Vercel AI Gateway - $5 free every month
AI_GATEWAY_API_KEY=

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> [!WARNING]
> Never commit `.env.local` to git. It is already in `.gitignore`.

### MCP (Model Context Protocol)

`/start-from-template` also creates `.mcp.json`, which connects the
**Supabase MCP** - giving Claude Code direct access to tables, migrations, and
schema. The file is in `.gitignore` because it contains a Personal Access
Token. Safe template: [.mcp.example.json](.mcp.example.json).


## Project Structure

```
.
├── app/                    # Next.js App Router
│   ├── [locale]/           # All pages under a locale prefix (en-US / he-IL)
│   │   ├── layout.tsx      # Owns <html lang dir> + NextIntlClientProvider
│   │   ├── page.tsx        # Home page
│   │   ├── dashboard/
│   │   ├── chat/
│   │   └── ...
│   ├── api/                # API routes (no locale)
│   │   └── chat/
│   ├── auth/               # Supabase callbacks (no locale)
│   │   ├── confirm/
│   │   └── signout/
│   └── globals.css
├── components/             # Your components
│   └── ui/                 # shadcn components (all pre-installed)
├── hooks/                  # React hooks
├── i18n/                   # next-intl config and navigation helpers
├── lib/                    # Utilities, auth guards, Supabase clients
├── messages/               # Translation catalogs (en-US.json, he-IL.json)
├── e2e/                    # Playwright tests
├── public/                 # Static files (including sw.js for PWA)
├── scripts/
│   └── setup.mjs           # Bootstrap script
├── .claude/
│   └── commands/
│       ├── start-from-template.md   # /start-from-template - Supabase + MCP + UI
│       ├── setup-github.md          # /setup-github - create GitHub repo
│       ├── setup-vercel.md          # /setup-vercel - CI/CD deploy via GitHub
│       └── setup-vercel-ai.md       # /setup-vercel-ai - Vercel AI Gateway
├── .agents/skills/         # Claude Code skills
├── .env.example            # Environment variable template
└── .mcp.example.json       # MCP template (Supabase + Context7)
```


## Common Issues

<details>
<summary>Wrong Node version</summary>

The template requires **Node 20+** (Node 22 LTS recommended per `.nvmrc`).
Check with:

```bash
node --version
```

If needed, install nvm and run `nvm install 22`.

</details>

<details>
<summary>npm run setup fails on git commit</summary>

Your git `user.email` / `user.name` is probably not configured. Set them:

```bash
git config --global user.name "Your Name"
git config --global user.email "email@example.com"
```

Then re-run the script or commit manually with `git commit`.

</details>

<details>
<summary>Claude Code not installed</summary>

```bash
npm install -g @anthropic-ai/claude-code
```

Then run `claude` inside the project folder.

</details>


## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Supabase](https://supabase.com/docs)
- [Vercel AI SDK](https://ai-sdk.dev)
- [Claude Code](https://docs.claude.com/en/docs/claude-code)
