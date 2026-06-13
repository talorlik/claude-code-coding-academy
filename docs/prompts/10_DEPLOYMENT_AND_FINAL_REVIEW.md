# Prompt: Deployment And Final Review

```text
Prepare Eyal's Coding Academy for final GitHub/Vercel submission.

Context:
- GitHub and Vercel setup were already initialized through the template workflow.
- Existing deployment configuration must be preserved.
- The app must deploy to Vercel and connect to Supabase in production.

Tasks:
1. Inspect Git status and ensure only project files are staged.
2. Confirm .env.local is ignored.
3. Confirm .mcp.json or token-bearing MCP files are ignored.
4. Search for accidental secrets in source and docs.
5. Run pre-deployment checks:
   - npm run lint
   - npm run typecheck
   - npm test
   - npx playwright test
   - npm run build
6. Verify Vercel environment variables are configured:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
   - SUPABASE_SECRET_KEY
   - AI_GATEWAY_API_KEY
   - NEXT_PUBLIC_APP_URL
   - NEXT_PUBLIC_TURNSTILE_SITE_KEY
   - TURNSTILE_SECRET_KEY if used server-side
   - YOUTUBE_API_KEY if playlist import is enabled
7. Verify Supabase production auth redirect URLs include the Vercel production URL.
8. Deploy or trigger deployment through the existing GitHub to Vercel flow.
9. Open the deployed URL.
10. Run final reviewer flow:
    - view home page
    - open a course
    - enroll as student
    - watch a lesson
    - mark lesson as watched
    - see progress update
    - ask AI tutor a contextual question
    - open student dashboard
    - open teacher dashboard as admin
11. Document final status in docs/planning/IMPLEMENTATION_LOG.md.

Rules:
- Do not print secret values.
- Do not change deployment architecture unless the existing one is broken.
- Fix blocking failures before final submission.
```
