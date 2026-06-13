# Assignment 1 - Online Course Platform

Build a complete online course platform for a private programming teacher.
The platform will let students browse courses, watch YouTube lessons, track
their progress, and ask an AI tutor for help inside the course context.

This assignment is part of the "Building Advanced Applications" chapter for
Eyal's Coding Academy.

## Table Of Contents

- [Assignment Overview][assignment-overview]
- [Business Scenario][business-scenario]
- [Learning Goals][learning-goals]
- [Final Product Requirements][final-product-requirements]
- [Prerequisites][prerequisites]
- [Recommended Workflow][recommended-workflow]
- [Milestone 0 - Install The Template][milestone-0]
- [Milestone 1 - Connect Supabase][milestone-1]
- [Milestone 2 - Install Skills And Magic MCP][milestone-2]
- [Milestone 3 - Design The Database][milestone-3]
- [Milestone 4 - Build The Home Page][milestone-4]
- [Milestone 5 - Build Course Management][milestone-5]
- [Milestone 6 - Build The Course Page][milestone-6]
- [Milestone 7 - Build The AI Tutor][milestone-7]
- [Milestone 8 - Build Dashboards][milestone-8]
- [Milestone 9 - Polish The Product][milestone-9]
- [Milestone 10 - Build Required Extended Features][milestone-10]
- [Milestone 11 - Save And Deploy][milestone-11]
- [Sample Course Content][sample-course-content]
- [Required Extended Features][required-extended-features]
- [Final Submission Checklist][final-submission-checklist]
- [Evaluation Rubric][evaluation-rubric]

[assignment-overview]: #assignment-overview
[business-scenario]: #business-scenario
[learning-goals]: #learning-goals
[final-product-requirements]: #final-product-requirements
[prerequisites]: #prerequisites
[recommended-workflow]: #recommended-workflow
[milestone-0]: #milestone-0---install-the-template
[milestone-1]: #milestone-1---connect-supabase
[milestone-2]: #milestone-2---install-skills-and-magic-mcp
[milestone-3]: #milestone-3---design-the-database
[milestone-4]: #milestone-4---build-the-home-page
[milestone-5]: #milestone-5---build-course-management
[milestone-6]: #milestone-6---build-the-course-page
[milestone-7]: #milestone-7---build-the-ai-tutor
[milestone-8]: #milestone-8---build-dashboards
[milestone-9]: #milestone-9---polish-the-product
[milestone-10]: #milestone-10---build-required-extended-features
[milestone-11]: #milestone-11---save-and-deploy
[sample-course-content]: #sample-course-content
[required-extended-features]: #required-extended-features
[final-submission-checklist]: #final-submission-checklist
[evaluation-rubric]: #evaluation-rubric

## Assignment Overview

Your task is to build a real product, not only a demo page. The application
should feel like a small SaaS product for a teacher who manages courses,
students, lessons, and student progress.

You will use:

- Claude Code for planning, implementation, and review.
- Supabase for database storage and authentication.
- YouTube content as the lesson source.
- Magic MCP by 21st.dev for professional UI components.
- Claude Code Skills for frontend design, UI/UX, and Supabase/Postgres
  best practices.
- GitHub for source control.
- Vercel for deployment.

By the end of the assignment, a student should be able to enroll in a course,
watch lessons, mark lessons as completed, see their progress, and ask an AI
tutor a question about the lesson they are watching.

## Business Scenario

Eyal Cohen is a full stack developer and private programming teacher. He
teaches 15 to 25 private students per month.

He teaches:

- HTML
- CSS
- JavaScript
- React
- Vibe Coding

### Current Problems

- Students ask the same beginner questions again and again.
- Eyal sends YouTube videos on WhatsApp, so learning materials are scattered.
- Students do not know which lesson to watch next.
- Eyal has no simple way to know who watched which lesson.
- Students get stuck between private lessons and wait for help.
- Eyal cannot easily compare progress between students and courses.

### Product Vision

Build a digital course platform where Eyal can upload courses based on
YouTube videos or playlists. Students can enroll, watch lessons, track
progress, and receive immediate help from an AI tutor that understands their
current course and lesson.

## Learning Goals

After completing this assignment, you should be able to:

- Convert a business case into application requirements.
- Design a relational database for a real application.
- Use Supabase tables, relationships, and row level security.
- Build student-facing and admin-facing pages.
- Embed YouTube videos in a Next.js application.
- Track course progress per student.
- Build an AI feature that uses application context.
- Use advanced Claude Code Skills and MCP tools effectively.
- Deploy a full stack application to Vercel.

## Final Product Requirements

Your final application must include both student and teacher functionality.

### Student Features

The student side must include:

- A home page with a professional course catalog.
- Course cards that show the course name, description, level, lesson count,
  and cover image.
- An enrollment action for each course.
- A course page with a lesson sidebar and embedded YouTube player.
- A progress bar that updates when lessons are completed.
- A "Mark as watched" action for each lesson.
- A personal dashboard that shows current courses and progress.
- An AI tutor chat that answers using the current course and lesson context.
- Smart search across courses and lessons.
- Completion certificates after finishing courses.
- Class group dashboard when the student belongs to a group.
- Simulated paid-course purchase/enrollment state.

### Teacher Features

The teacher/admin side must include:

- A course management page.
- A form for creating new courses.
- A lesson creation flow based on YouTube video links.
- A way to add multiple lessons from a YouTube playlist.
- A way to reorder lessons.
- A teacher dashboard with student progress.
- A way to identify students who may be stuck.
- A summary of common AI tutor questions.
- Class group management.
- Inactive-student reminder review and sending.
- Simulated paid-course management.
- Certificate verification.

### Technical Requirements

Your application must:

- Store courses, lessons, enrollments, progress, and tutor conversations in
  Supabase.
- Use meaningful table relationships instead of storing everything in one
  table.
- Use row level security where student data is private.
- Keep API keys and secrets out of Git.
- Run locally with `npm run dev`.
- Deploy successfully on Vercel.
- Work well on desktop and mobile screens.
- Include certificates, smart search, class groups, reminders, and simulated
  payments as required product scope.

## Prerequisites

Before you begin, make sure you have:

- Node.js installed.
- A GitHub account.
- A Supabase account.
- A Vercel account.
- Claude Code installed and working.
- A code editor such as VS Code.
- Basic familiarity with React, Next.js, and Supabase.

> [!IMPORTANT]
> Never commit `.env.local`, Supabase keys, YouTube API keys, or any other
> secret value to GitHub.

## Recommended Workflow

Work one milestone at a time. At the end of each milestone, verify that the
application still runs and that the feature works from the browser.

Recommended rhythm:

1. Read the milestone.
1. Ask Claude Code to plan the implementation.
1. Ask Claude Code to implement the feature.
1. Test the feature manually.
1. Fix issues before moving to the next milestone.
1. Save your work to Git.

Use clear prompts. Do not ask Claude Code to build the entire application in
one message. Smaller prompts produce better results and make debugging easier.

## Milestone 0 - Install The Template

Start from the provided project template.

Template:

```text
https://game-changer.brainai.co.il/template
```

When the script asks for the project name, enter:

```text
code-academy
```

You may choose another project name if your instructor allows it.

After the script finishes:

1. Open VS Code.
1. Open the project folder.
1. Open a new terminal.
1. Run the development server:

   ```bash
   npm run dev
   ```

1. Open the local application:

   ```text
   http://localhost:3000
   ```

### Acceptance Criteria

This milestone is complete when:

- The template project opens in your editor.
- `npm run dev` starts without errors.
- The template home page is visible at `http://localhost:3000`.

## Milestone 1 - Connect Supabase

Connect the application to Supabase by running the template setup flow.

In the Claude Code panel inside VS Code, run:

```text
/start-from-template
```

Follow the instructions shown by the command. It should help you create or
connect a Supabase project and configure the local environment.

### Verify The Connection

After the setup finishes, check that:

- A Supabase project exists for this assignment.
- `.env.local` contains the required Supabase values.
- Supabase MCP is configured.
- Claude Code can inspect or modify the database when needed.
- The app still runs at `http://localhost:3000`.

### Acceptance Criteria

This milestone is complete when:

- The application can connect to Supabase.
- There are no missing environment variable errors.
- You can run the local app after connecting Supabase.

## Milestone 2 - Install Skills And Magic MCP

This assignment uses advanced Claude Code capabilities. Install them before
building the main application features.

### Required Skills

Install these Skills if they are not already installed.

#### Frontend Design

Use this Skill for professional interface design.

Skill page:

```text
https://skills.sh/anthropics/skills/frontend-design
```

#### UI/UX Pro Max

Use this Skill for advanced UX patterns, micro-interactions, animations, and
SaaS-level interface polish.

Skill page:

```text
https://skills.sh/nextlevelbuilder/ui-ux-pro-max-skill/ui-ux-pro-max
```

#### Supabase Postgres Best Practices

Use this Skill for schema design, indexes, relationships, and row level
security.

Skill page:

```text
https://skills.sh/supabase/agent-skills/supabase-postgres-best-practices
```

### How To Install The Skills

1. Open each Skill page.
1. Copy the installation command shown on the page.
1. Run the command in your terminal.
1. Restart Claude Code after installation.

### Install Magic MCP By 21st.dev

Magic MCP connects Claude Code to a large library of professional UI
components.

Use it for:

- Buttons
- Forms
- Hero sections
- Course cards
- Dashboards
- Empty states
- Navigation components

#### Step A - Get An API Key

1. Go to `https://21st.dev/mcp`.
1. Sign up for a free account.
1. Create an API key.
1. Copy the key.

#### Step B - Install The MCP

Open the terminal and run the Claude Code installation command from the
21st.dev MCP website.

The command includes this placeholder:

```text
YOUR_API_KEY_HERE
```

Replace it with your real API key before running the command.

> [!IMPORTANT]
> The 21st.dev website includes installation instructions for several editors.
> Use the Claude Code instructions for this assignment.

#### Step C - Verify The Installation

Run:

```bash
claude mcp list
```

You should see `magic` in the list.

#### Step D - Start A New Conversation

Close and reopen Claude Code or start a new conversation after installing
Skills and MCPs. New Skills and MCP servers are loaded only in a new
conversation.

### Prompting Rule

At the beginning of UI prompts, write:

```text
Use frontend-design, ui-ux-pro-max, and Magic MCP.
```

At the beginning of database prompts, write:

```text
Use supabase-postgres-best-practices.
```

### Acceptance Criteria

This milestone is complete when:

- The three required Skills are installed.
- `claude mcp list` shows `magic`.
- You started a new Claude Code conversation after installation.

## Milestone 3 - Design The Database

Before building pages, design the Supabase database. Ask Claude Code to plan
the schema before generating migrations.

Suggested prompt:

```text
Use supabase-postgres-best-practices.

Plan the database schema for an online course platform for Eyal's Coding
Academy. The app needs courses, lessons, enrollments, student progress,
AI tutor conversations, teacher dashboard data, certificates, search, class
groups, reminders, and simulated payments.

Include table relationships, indexes, row level security policies, and sample
seed data. After the plan, generate the Supabase migration.
```

### Required Tables

Your schema should include at least:

- `profiles` or `users`
- `courses`
- `lessons`
- `enrollments`
- `lesson_progress`
- `ai_tutor_conversations`
- `ai_tutor_messages`
- `certificates`
- `class_groups`
- `class_group_members`
- `reminder_events`
- `course_prices`
- `payments`

You may add more supporting tables if your design needs them, such as `badges`,
`course_categories`, `student_notes`, or search index tables.

### Suggested Data Model

Use these relationships as a starting point:

- A course has many lessons.
- A user can enroll in many courses.
- An enrollment belongs to one user and one course.
- Lesson progress belongs to one user, one course, and one lesson.
- A tutor conversation belongs to one user, one course, and optionally one
  lesson.
- Tutor messages belong to a tutor conversation.
- A certificate belongs to one user and one completed course.
- A class group has many student memberships.
- A reminder event belongs to a student and may reference a course.
- A simulated payment belongs to one user and one paid course.

### Row Level Security Expectations

At minimum:

- Students can read public course and lesson data.
- Students can only read and update their own enrollments.
- Students can only read and update their own progress.
- Students can only read their own AI tutor conversations.
- Students can only read their own certificates, group memberships, and payment
  state.
- Eyal/admin users can manage courses and lessons.
- Eyal/admin users can view student progress.
- Eyal/admin users can manage groups, reminders, certificates, and simulated
  paid-course state.

### Seed Data

Add enough sample data to test the application:

- Two sample courses.
- At least three lessons per course.
- One admin user profile.
- At least two sample student profiles if your setup supports seeded users.

### Acceptance Criteria

This milestone is complete when:

- The required tables exist in Supabase.
- Relationships use foreign keys.
- Row level security is enabled where needed.
- Sample course and lesson data exists.
- The app can read courses from Supabase.

## Milestone 4 - Build The Home Page

Build a professional landing page and course catalog.

Suggested prompt:

```text
Use frontend-design, ui-ux-pro-max, and Magic MCP.

Build a professional home page for Eyal's Coding Academy. Include a hero
section with a clear call to action, an "Our Courses" section that loads
courses from Supabase, and a "Why Learn With Us" section.

Make the design feel like a modern SaaS product and ensure it works on mobile.
```

### Required Sections

The home page must include:

- Hero section with product value proposition.
- Primary call to action.
- Course catalog loaded from Supabase.
- Course cards with name, description, level, lesson count, and cover image.
- Trust or benefits section explaining why students should learn with Eyal.

### Acceptance Criteria

This milestone is complete when:

- The home page displays real course data from Supabase.
- Each course card has a clear enrollment action.
- The page is responsive on mobile.
- Loading and empty states are handled cleanly.

## Milestone 5 - Build Course Management

Build Eyal's admin course management page.

Suggested prompt:

```text
Use frontend-design, ui-ux-pro-max, Magic MCP, and
supabase-postgres-best-practices.

Build an admin course management page where Eyal can create courses and add
lessons from YouTube video or playlist links. Save all course and lesson data
in Supabase.
```

### Required Admin Capabilities

The admin page must support:

- Creating a course with name, description, level, and cover image.
- Editing basic course details.
- Adding a lesson from a YouTube video link.
- Adding multiple lessons from a YouTube playlist link.
- Saving lesson title, description, duration, video URL, and sort order.
- Reordering lessons.
- Deleting a lesson if it was added by mistake.

### YouTube Integration Options

You can use one of these approaches:

- YouTube oEmbed API for basic video metadata without an API key.
- YouTube Data API for playlist support and richer metadata.

If you use the YouTube Data API, store the API key in `.env.local` and in
Vercel environment variables. Do not commit the key.

### Acceptance Criteria

This milestone is complete when:

- Eyal can create a course from the admin page.
- Eyal can add at least one YouTube video as a lesson.
- Playlist import works, or the app clearly documents that playlist import
  requires the YouTube Data API key.
- Lesson data is saved in Supabase.
- Invalid YouTube links show a helpful error message.

## Milestone 6 - Build The Course Page

Build the student course learning experience.

Suggested prompt:

```text
Use frontend-design, ui-ux-pro-max, and Magic MCP.

Build a professional course page with a lesson sidebar, embedded YouTube
player, lesson details, progress bar, and a "Mark as watched" button that
updates Supabase.
```

### Required Course Page Behavior

The course page must include:

- Course title and description.
- Lesson list in a sidebar.
- Checkmark for completed lessons.
- Embedded YouTube player for the selected lesson.
- Lesson title and description.
- Progress bar for the current student.
- "Mark as watched" button.
- Automatic move to the next lesson after marking a lesson as watched.

### Progress Tracking Rules

Use these rules:

- Progress is tracked per student and per lesson.
- A lesson can be marked as watched only once.
- Completing a lesson updates the course progress percentage.
- Progress remains saved after refresh.

### Acceptance Criteria

This milestone is complete when:

- A student can open a course and play a lesson.
- Marking a lesson as watched writes to Supabase.
- Completed lessons display a checkmark.
- The progress bar updates correctly.
- Progress remains visible after refreshing the page.

## Milestone 7 - Build The AI Tutor

Build an AI tutor chat inside the course experience.

The AI tutor should not be a generic chatbot. It must answer based on the
course and lesson the student is currently viewing.

Suggested prompt:

```text
Build an AI tutor for the course page.

The tutor must know the current course name, lesson title, lesson description,
YouTube video URL, and the student's recent question history. Save
conversations and messages in Supabase.

When a student asks for help, answer in a friendly teaching style and relate
the answer to the current lesson.
```

### Required Context

Send the AI model this context when the student asks a question:

- Course name.
- Course description.
- Lesson title.
- Lesson description.
- YouTube video URL.
- Student's recent messages in the same conversation.

### Required Tutor Behavior

The AI tutor should:

- Explain concepts simply.
- Ask a short follow-up question when the student's question is unclear.
- Avoid pretending to see the exact video timestamp unless you provide it.
- Encourage the student to try a small exercise when appropriate.
- Store the student's question and the tutor response.

### Acceptance Criteria

This milestone is complete when:

- Students can ask questions from the course page.
- The tutor response uses the current course and lesson context.
- Conversation history is saved in Supabase.
- Refreshing the page does not erase previous messages.
- The UI handles loading and error states.

## Milestone 8 - Build Dashboards

Build dashboards for both students and Eyal.

### Student Dashboard

The student dashboard should show:

- Courses the student is enrolled in.
- Completion percentage for each course.
- Weekly progress summary.
- Recently watched lessons.
- Achievement badges.

Suggested badges:

- Completed my first course.
- Watched five lessons this week.
- Finished a beginner course.

### Teacher Dashboard

Eyal's dashboard should show:

- Total students.
- Total enrollments.
- Course completion rates.
- Students who have not watched a lesson in over a week.
- Common questions from the AI tutor.
- Recent course activity.

Suggested prompt:

```text
Use frontend-design, ui-ux-pro-max, and Magic MCP.

Build student and teacher dashboards for the course platform. The design
should feel like a modern analytics dashboard at the level of Linear or
Vercel.
```

### Acceptance Criteria

This milestone is complete when:

- `/dashboard` shows student-specific progress.
- `/admin/dashboard` shows teacher-level analytics.
- Dashboard data comes from Supabase.
- Empty states are clear when there is no activity yet.
- The dashboards work on mobile.

## Milestone 9 - Polish The Product

After the main features work, improve the product quality.

Ask Claude Code to review the application with:

- `frontend-design`
- `ui-ux-pro-max`

Suggested prompt:

```text
Use frontend-design and ui-ux-pro-max.

Review the application as a professional SaaS product. Improve loading states,
empty states, mobile responsiveness, spacing, visual hierarchy, and subtle
interactions. Keep the existing functionality working.
```

### Required Polish

Improve:

- Loading states with skeletons where appropriate.
- Empty states for no courses, no lessons, and no progress.
- Form validation messages.
- Mobile navigation and responsive layouts.
- Button, card, and form consistency.
- Error messages for failed Supabase or YouTube requests.

### Optional Polish

If you have time, add:

- Dark mode.
- Subtle animations.
- Course completion celebration.
- Better badge visuals.

### Acceptance Criteria

This milestone is complete when:

- The product feels visually consistent.
- The main flows work on mobile.
- Loading, empty, and error states are not broken or confusing.
- No major layout issues appear on small screens.

## Milestone 10 - Build Required Extended Features

These features are required product scope. Implement them before final QA and
deployment.

Suggested prompt:

```text
Use frontend-design, ui-ux-pro-max, Magic MCP, and
supabase-postgres-best-practices.

Build the required extended features for Eyal's Coding Academy: completion
certificates, smart search, class groups, reminders, and simulated paid courses.
Integrate them with the existing Supabase schema, admin pages, student
dashboards, localization, testing, and deployment checks.
```

### Required Capabilities

- Generate and store completion certificates when students complete courses.
- Let students view and download their own certificates.
- Let students search course titles, lesson titles, and lesson descriptions.
- Include transcript search when transcript data exists.
- Let Eyal create class groups and assign students.
- Show group dashboards to admins and scoped group dashboards to students.
- Identify inactive students and queue or send reminders.
- Record reminder events so notifications are idempotent.
- Add a complete simulated payment flow so Eyal can demonstrate paid courses.
- Gate paid-course enrollment by simulated purchase state or admin access.
- Make it explicit in the UI that no actual payment takes place and no money
  exchanges hands.
- Require only fake/demo payment details. Do not request real credit card, bank,
  wallet, or other payment method details.
- Mark successful simulated payments as `paid`.

### Acceptance Criteria

This milestone is complete when:

- Certificates are created after course completion.
- Search returns scoped, relevant course or lesson results.
- Group dashboards show only authorized data.
- Reminder review/sending is visible and does not fail silently.
- Simulated checkout and payment state are implemented without real payment
  provider secrets.
- Unit, integration, and e2e tests cover these required features with mocks for
  external services where appropriate.

## Milestone 11 - Save And Deploy

Save the current stage in GitHub and deploy the application to Vercel.

### GitHub

Follow the GitHub upload lesson from the course:

```text
Step 2: Connecting to GitHub and uploading the application
https://game-changer.brainai.co.il/courses/ai-game-changer-3/1ete05v
```

Before pushing:

- Confirm `.env.local` is ignored.
- Run the project locally.
- Commit only the files that belong to the project.

### Vercel

Follow the Vercel deployment lesson from the course:

```text
Step 3: Deploying the application - Connecting to Vercel
https://game-changer.brainai.co.il/courses/ai-game-changer-3/0k5jul5
```

After importing the GitHub repository into Vercel:

- Add all required environment variables.
- Deploy the application.
- Open the deployed URL.
- Test the main student and admin flows.

### Acceptance Criteria

This milestone is complete when:

- The code is pushed to GitHub.
- The application deploys successfully on Vercel.
- The deployed app can connect to Supabase.
- The deployed app can display courses.
- The deployed app can complete the main course flow.

## Sample Course Content

You may use these playlists as sample content for your platform.

### Course 1

```text
https://www.youtube.com/playlist?list=PLkD4ksZgZ-nrX6kCvfoCHJr3GyFRnbab3
```

### Course 2

```text
https://www.youtube.com/playlist?list=PLkmvmF0zhgT_cKQTLZOSlnEHtynu4JcpY
```

You may also use your own content if it fits the learning platform.

## Required Extended Features

The following features are required for the final product. Implement them as
part of the main product scope.

### Completion Certificates

Generate a PDF certificate when a student completes a course.

### Smart Search

Allow students to search inside lesson titles, descriptions, or video
transcripts when transcript data exists.

Possible tool:

```text
YouTube Transcript API
```

### Class Groups

Create groups of students who learn together and share a class dashboard.

### Reminders

Send an email or message to a student who has not logged in for a week.

### Payments

Add a complete simulated payment flow so Eyal can demonstrate paid courses.
No actual payment takes place, no money exchanges hands, and no real credit
card, bank, wallet, or other payment method details are required. Any payment
details are fake/demo-only, and successful simulated checkout marks the course
payment as `paid`.

## Final Submission Checklist

Before submitting, verify each item.

### Setup

- The project runs locally with `npm run dev`.
- Supabase is connected.
- Required environment variables are configured locally.
- Secrets are not committed to GitHub.

### Student Flow

- The home page displays courses from Supabase.
- A student can enroll in a course.
- A student can open a course page.
- A student can watch a YouTube lesson.
- A student can mark a lesson as watched.
- The progress bar updates correctly.
- The student dashboard shows progress.
- The AI tutor answers with course and lesson context.
- The student can search for courses or lessons.
- The student can download a certificate after completing a course.
- The student can see class group information when assigned to a group.
- Simulated paid-course enrollment state is clear.

### Teacher Flow

- Eyal can create a course.
- Eyal can add lessons from YouTube.
- Eyal can view student progress.
- Eyal can see students who may be stuck.
- Eyal can view common AI tutor questions.
- Eyal can manage class groups.
- Eyal can review inactive-student reminders.
- Eyal can verify certificates.
- Eyal can manage simulated paid-course state.

### Product Quality

- The app is responsive on mobile.
- Loading states are handled.
- Empty states are clear.
- Form errors are understandable.
- The UI feels consistent and professional.

### Deployment

- The project is pushed to GitHub.
- The Vercel deployment succeeds.
- Environment variables are configured in Vercel.
- The deployed app connects to Supabase.
- The deployed app supports the main user flows.

## Evaluation Rubric

| Category | Excellent | Needs Work |
| --- | --- | --- |
| Database | Clear schema, relationships, RLS, and seed data | Missing relationships, weak RLS, or hardcoded data |
| Student Experience | Smooth course catalog, player, progress, and dashboard | Core flow is incomplete or confusing |
| Teacher Experience | Course management and analytics are useful | Admin flow is missing or mostly static |
| AI Tutor | Uses course and lesson context effectively | Generic chatbot or no saved history |
| UI Quality | Professional, responsive, polished interface | Broken layouts or inconsistent design |
| Deployment | Works locally and on Vercel | Deployment missing or broken |

## Completion Standard

The assignment is complete when a reviewer can open your deployed app and
complete this flow:

1. View the home page.
1. Open a course.
1. Enroll as a student.
1. Watch a lesson.
1. Mark the lesson as watched.
1. See progress update.
1. Ask the AI tutor a question about the current lesson.
1. Open the student dashboard.
1. Open the teacher dashboard.

If that flow works and the app is deployed, you have built the core product.
