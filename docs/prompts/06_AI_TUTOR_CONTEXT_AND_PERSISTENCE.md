# Prompt: AI Tutor Context And Persistence

```text
Build the contextual AI tutor for the course learning page.

Context:
- The current project already has Vercel AI SDK and an /api/chat route streaming with openai/gpt-4o-mini through the AI gateway.
- Preserve that implementation pattern unless there is a clear reason to create a dedicated /api/tutor route.
- The tutor must not be a generic chatbot. It must answer using course and lesson context.
- Tutor conversations and messages must be stored in Supabase.

Requirements:
1. Inspect existing /api/chat route and AI SDK usage.
2. Decide whether to extend /api/chat or create /api/tutor. Document the decision.
3. Implement tutor prompt builder that includes:
   - course name
   - course description
   - lesson title
   - lesson description
   - YouTube video URL
   - active locale
   - recent conversation messages
4. The system prompt must instruct the tutor to:
   - explain concepts simply
   - answer in the active locale unless the user asks otherwise
   - relate answers to the current course/lesson
   - ask one short clarification question when needed
   - suggest a small exercise when useful
   - avoid pretending to see exact video timestamps or unseen transcript content
5. Implement tutor persistence:
   - create conversation if missing
   - save user question
   - stream assistant answer
   - save assistant answer after stream completion
   - reload history after refresh
6. Protect the route:
   - require authenticated user
   - verify course access/enrollment
   - ensure users can only access their own conversations
7. Build TutorChat UI on the course page:
   - message list
   - input form
   - streaming state
   - retry/error state
   - empty state
   - mobile-friendly layout
   - EN/HE/RTL support
8. Add TSDoc to prompt builder, route helpers, and tutor data functions.
9. Add tests:
   - unit test prompt builder
   - integration test tutor route with mocked AI provider
   - e2e tutor question and refresh persistence flow, using mocked AI if needed

Rules:
- Do not expose AI_GATEWAY_API_KEY to client code.
- Do not send unnecessary private student data to the model.
- Do not store secrets in tutor metadata.
- Do not claim transcript or timestamp awareness unless transcript/timestamp data is explicitly provided.
```
