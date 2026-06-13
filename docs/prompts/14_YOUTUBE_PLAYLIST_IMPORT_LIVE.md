# Prompt: YouTube Playlist Import - Live Key Activation

```text
Activate live YouTube playlist import now that YOUTUBE_API_KEY is configured.

Planning anchors:
- Task breakdown: docs/planning/TASK_BREAKDOWN.md, Tasks 13.1-13.2.
- Technical requirements: docs/planning/TECHNICAL_REQUIREMENTS.md,
  Sections 5, 8.2, 9.4, 15.
- Builds on batch 04 (lib/youtube/parser.ts, lib/youtube/metadata.ts) and
  batch 07 (lib/youtube/playlist.ts, components/admin/youtube-playlist-import.tsx).

Context:
- The parser + metadata + import code already exist and were written to degrade
  gracefully when YOUTUBE_API_KEY is absent (returning MISSING_API_KEY_MESSAGE).
- YOUTUBE_API_KEY is NOW set in .env.local and in Vercel (Preview + Production),
  verified working against the live YouTube Data API v3 (videos.list HTTP 200).
- The key is server-only. It must never reach a client bundle or carry a
  NEXT_PUBLIC_ prefix.

Tasks:
1. Inspect lib/youtube/metadata.ts (fetchPlaylistItems, fetchVideoOEmbed,
   iso8601DurationToSeconds), lib/youtube/playlist.ts (importPlaylist),
   components/admin/youtube-playlist-import.tsx, and the admin lessons page.
2. Confirm the import path is end-to-end correct against the REAL API shape:
   playlistItems.list pagination (pageToken, the 200-item cap), the
   videos.list contentDetails duration enrichment in batches of 50, and the
   ISO-8601 duration parse. Fix any mismatch with the real response shape found
   during verification.
3. Improve the admin playlist-import UX now that the key exists: a successful
   import should show the imported lesson count and the imported lessons; a
   failed import (bad playlist id, private playlist, quota 403) shows a clear
   localized error - NOT the generic missing-key message (that message is now
   only for the genuinely-unset-key case, which will not happen in this deploy
   but must still be handled).
4. Keep all automated tests DETERMINISTIC: the default vitest/playwright run
   must NOT call the real YouTube API. Mock fetch / fetchPlaylistItems as the
   existing tests do. Add a SEPARATE, opt-in live test guarded behind an env
   flag (e.g. YOUTUBE_LIVE_TEST=true) that exercises the real API against a
   stable public playlist, and is test.skip by default. Document it.
5. Add EN/HE strings for any new user-facing import-result text; keep catalogs
   key-identical (npm run lint:i18n).
6. Do not expose YOUTUBE_API_KEY to the client. Do not commit secrets.
7. Update docs/planning/IMPLEMENTATION_LOG.md with the live-activation notes:
   what was verified against the real API, the live-test opt-in flag, any
   response-shape fixes.

Acceptance criteria:
- Admin can import a real YouTube playlist into a course as ordered lesson
  drafts with titles, video ids, thumbnails, and durations.
- A bad/private playlist shows a clear localized error, not a crash.
- The default test suite passes with all external calls mocked.
- An opt-in live test verifies the real API path and is skipped by default.
- npm run lint, lint:i18n, typecheck, test, build, and test:e2e all pass.

Rules:
- Do not weaken secret handling; the key stays server-only.
- Do not make the default test suite depend on the live API or network.
- Reuse the existing parser/metadata/import modules; this is activation +
  hardening, not a rewrite.
```
