# Eyal's Coding Academy - Batch Build Runbook

Canonical authority for the `/run-batch NN` build of Eyal's Coding Academy
(course platform + AI tutor). The `run-batch` skill reads this file at Step 0.2.
It governs batch order, git workflow, and the gate set. The per-batch execution
brief is the prompt file; the per-batch acceptance checklist is the matching
section of `docs/planning/TASK_BREAKDOWN.md`.

> [!NOTE]
> This file lives in-repo at `docs/planning/RUNBOOK.md`, alongside the other
> planning docs, so everything for this project stays within it. The project's
> `.claude/commands/run-batch.md` and `run-batch-tech-debt.md` read it from this
> repo-relative path. If you relocate it, update this note and both command
> references together.

## Authorities

- **Prompt files:** `docs/prompts/NN_*.md` in the repo - the execution brief
  for each batch. Follow their Tasks verbatim.
- **Task breakdown:** `docs/planning/TASK_BREAKDOWN.md` - the Prompt File Map,
  the Requirement Cross-Reference Map, and the per-batch task sections
  (acceptance checklist + exact files).
- **Prompt index:** `docs/prompts/README.md` - recommended order with task
  ranges and technical sections.
- **Technical source of truth:** `docs/planning/TECHNICAL_REQUIREMENTS.md`.
- **Cross-batch state and gotchas:** the `academy-build-state` auto-memory and
  `docs/planning/IMPLEMENTATION_LOG.md`.
- **Design spec for batches 16-19:**
  `docs/superpowers/specs/2026-06-14-courses-catalog-and-content-pages-design.md`.

## Batch Order

Batches are strictly sequential: one squash commit on local `main` per
completed batch. The range is open-ended (`00-n`) - there is NO fixed upper
bound; new batches are appended over time. A batch is valid only when `NN` is a
non-negative integer AND a matching `docs/prompts/NN_*.md` exists. Do not assume
the highest batch listed here is the last one; always check
`ls docs/prompts/` for the batches that currently exist.

The table below lists the batches that exist **as of 2026-06-14** (00-19). It
is a snapshot, not a ceiling - expect rows beyond 19 in future.

| Batch | Prompt File | Nature | Branch Prefix | Status |
| --- | --- | --- | --- | --- |
| 00 | `00_VERIFY_EXISTING_IMPLEMENTATION.md` | Verify baseline | `chore/` | Done |
| 01 | `01_PLANNING_ALIGNMENT_AND_TEST_HARNESS.md` | Test harness | `chore/` | Done |
| 02 | `02_DATABASE_SCHEMA_AND_RLS.md` | Schema + RLS | `feature/` | Done |
| 03 | `03_DOMAIN_TYPES_VALIDATION_AND_DATA_ACCESS.md` | Domain layer | `feature/` | Done |
| 03 | `04_YOUTUBE_PARSER_AND_METADATA.md` | YouTube parser | `feature/` | Done |
| 04 | `05_HOME_PAGE_AND_CATALOG.md` | Home + catalog | `feature/` | Done |
| 05 | `06_COURSE_PAGE_AND_PROGRESS.md` | Course page | `feature/` | Done |
| 06 | `07_ADMIN_COURSE_MANAGEMENT.md` | Admin mgmt | `feature/` | Done |
| 07 | `08_AI_TUTOR_CONTEXT_AND_PERSISTENCE.md` | AI tutor | `feature/` | Done |
| 08 | `09_DASHBOARDS.md` | Dashboards | `feature/` | Done |
| 09 | `10_LOCALIZATION_SEO_ACCESSIBILITY_POLISH.md` | Polish | `feature/` | Done |
| 10 | `11_REQUIRED_EXTENDED_FEATURES.md` | Extended features | `feature/` | Done |
| 11 | `12_TESTING_AND_QA.md` | Test completion | `test/` | Done |
| 12 | `13_DEPLOYMENT_AND_FINAL_REVIEW.md` | Deployment | `feature/` | Done |
| 14 | `14_YOUTUBE_PLAYLIST_IMPORT_LIVE.md` | YouTube live key | `feature/` | Done |
| 15 | `15_REMINDER_EMAIL_DELIVERY_SMTP.md` | Reminder SMTP | `feature/` | Done |
| 16 | `16_ABOUT_AND_CONTACT_PAGES.md` | About + Contact | `feature/` | Done |
| 17 | `17_CATALOG_SCHEMA_CATEGORIES_AND_REVIEWS.md` | Catalog schema | `feature/` | Pending |
| 18 | `18_COURSES_CATALOG_PAGE.md` | Catalog page | `feature/` | Pending |
| 19 | `19_COURSE_REVIEWS_AND_LESSON_SEARCH.md` | Reviews + search | `feature/` | Pending |

Notes:

- Prompt file numbers are offset by one from batch numbers from batch 03 onward
  (batch 03 owns both prompt 03 and prompt 04). The Prompt File Map in
  `TASK_BREAKDOWN.md` is the precise mapping.
- There is no batch 13 in the prompt numbering; batches 14+ were appended after
  the initial 00-13 build (the numbering jump is historical, not a gap in work).
- Batches 16-19 implement the courses-catalog and content-pages design spec and
  are decomposed smallest-blast-radius first: 16 content pages (no DB), 17
  schema only, 18 the catalog page, 19 reviews + in-course lesson search.

## Branch Prefix Selection

Pick by batch nature: `chore/` for setup/infra batches (00, 01), `test/` for
test-completion batches (11), `docs/` for doc-only batches, otherwise
`feature/`. Derive a short slug from the prompt title. Worktrees are siblings:
`../academy-NN-<slug>`, branch `<prefix>/NN-<slug>`. The prompt file's Rules
block names the exact worktree path and branch for that batch - use it.

## Git Workflow

Per-branch worktree off clean `main` -> implement -> gates pass -> squash-merge
into local `main` in the primary checkout -> remove worktree and delete branch.

1. Confirm the primary checkout is on `main` with a clean tree and that batch
   `NN-1` is already merged (one squash commit per completed batch).
2. `git worktree add ../academy-NN-<slug> -b <prefix>/NN-<slug>`. Copy
   `.env.local` and `node_modules` into the worktree (the build run's
   convention - see the `git-workflow-decisions` memory).
3. Implement the prompt's Tasks; add/update tests for every changed behavior;
   mock all AI and external-network calls in the default test suite.
4. Run the gate set (below) to exit 0, with the self-correction loop.
5. Commit in the worktree, optionally push the feature branch (allowed), then
   `git merge --squash <branch>` into local `main` and commit with the same
   message. Include the `DECISIONS.md` append in this squash commit.
6. Remove the worktree, delete the local and remote feature branch.

Dependency reconcile: immediately after the squash-merge, check
`git diff --name-only HEAD~1 HEAD -- package.json package-lock.json`. If either
changed, run `npm install` in the primary checkout before any gate (the
worktree installed deps in isolation). Clear a stale `.next/` (`rm -rf .next`)
before re-running gates if routes moved.

### Push Policy

NEVER push local `main` by default - a push to `origin main` triggers the
production Vercel deploy (see the `main-push-policy` memory). EXCEPTION: for
this build run, Tal authorized (2026-06-13) pushing `main` after every
squash-merge so each batch deploys; the design-spec footer repeats "push
authorized for this build run." That authorization is scoped to this
engagement only. Feature branches may always be pushed.

## Gate Set

Most batches:

```bash
npm run lint
npm run lint:i18n
npm run typecheck
npm run build
npm test
npm run test:e2e
```

- Gates need Node 22.16.0. Non-interactive shells can fall back to a stale
  Node 18; prefix `PATH="$HOME/.nvm/versions/node/v22.16.0/bin:$PATH"` (see the
  `node-version-for-tooling` memory).
- `lint:i18n` enforces that `messages/en-US.json` and `messages/he-IL.json` are
  key-identical. `typecheck` and `build` run a `guard-no-middleware` check that
  hard-fails if a root `middleware.ts` exists - never create one.
- Run `typecheck` to its exit code; do not trust a `tail` of the log (a subagent
  once reported it clean when it had failed - see the batch-11 verification
  lesson in `academy-build-state`).
- e2e starts its own dev server on port 3100. The PWA service worker can serve a
  cached, unstyled offline page in a manual dev preview; the Playwright suite
  (fresh server) is the authoritative behavioral proof, not a screenshot.

### Self-Correction And Retry Cap

If a gate fails, debug systematically, fix the cause, and re-run that gate.
Retry cap is 3 attempts per gate. If a gate still fails after 3 attempts (or a
genuine blocker like a missing key or an unresolved ambiguity is hit), take the
failure path: commit WIP on the feature branch (`WIP(NN): <reason>`), leave the
worktree intact, do NOT squash-merge, and report STOPPED. `main` must stay
clean and green.

## Per-Batch Capture (Before Context Is Cleared)

Each batch runs in its own session and is `/clear`ed afterward. Before
reporting, capture anything non-obvious:

1. Append a dated entry to `docs/DECISIONS.md` (repo-durable; lands in the
   squash commit on the success path, on the WIP branch on the failure path).
2. Update `docs/planning/IMPLEMENTATION_LOG.md` with the batch's What/Decisions/
   Verification.
3. Update the `academy-build-state` auto-memory only for cross-batch facts the
   next session must load (constraints, traps, forward-references). Skip purely
   historical notes - those live in `DECISIONS.md`.

If genuinely nothing non-obvious happened, state "no new decisions to capture".
