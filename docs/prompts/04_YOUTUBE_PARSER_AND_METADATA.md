# Prompt: YouTube Parser And Metadata Integration

```text
Implement YouTube video and playlist support for the admin lesson workflow.

Planning anchors:
- Task breakdown: docs/planning/TASK_BREAKDOWN.md, Task 3.3.
- Technical requirements: docs/planning/TECHNICAL_REQUIREMENTS.md,
  Sections 5, 6.3, 8.2, 9.4, 14, 15.
- Prompt map: docs/prompts/README.md.

Context:
- The platform stores YouTube lessons in Supabase.
- A lesson may be added from a single YouTube video URL.
- Multiple lessons may be imported from a YouTube playlist if YOUTUBE_API_KEY is configured server-side.
- If YOUTUBE_API_KEY is missing, the UI must clearly explain that playlist import requires it.

Tasks:
1. Inspect existing project validation and API/server-action conventions.
2. Create a pure YouTube parser module that extracts:
   - video ID from youtube.com/watch, youtu.be, youtube.com/embed, and youtube.com/shorts URLs where appropriate
   - playlist ID from youtube.com/playlist and watch URLs with list parameter
3. Reject non-YouTube URLs and malformed IDs.
4. Add unit tests for valid and invalid video and playlist URLs.
5. Create server-only metadata helpers:
   - oEmbed fetch for basic single-video metadata without API key
   - YouTube Data API playlist fetch using YOUTUBE_API_KEY only on the server
6. Add safe error handling for unavailable metadata, invalid URLs, missing API key, and API rate failures.
7. Ensure no API key is exposed to client bundles.
8. Add TSDoc to exported parser and metadata helpers.

Acceptance criteria:
- Single YouTube video link can produce lesson-ready metadata.
- Playlist URL can produce lesson draft metadata when YOUTUBE_API_KEY exists.
- Missing YOUTUBE_API_KEY returns a clear user-facing error for playlist import.
- Parser is fully unit tested.
```
