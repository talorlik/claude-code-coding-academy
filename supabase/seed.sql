-- Seed data: idempotent (INSERT ... ON CONFLICT DO NOTHING keyed on slug).
-- Real, well-known public YouTube video IDs from freeCodeCamp/Traversy Media.
-- No real payment secrets. No profiles/enrollments tied to specific auth users.
-- created_by is resolved safely via user_roles; NULL when no instructor exists.

-- ---------------------------------------------------------------------------
-- Courses
-- ---------------------------------------------------------------------------
insert into public.courses (
  id,
  slug,
  title,
  description,
  level,
  status,
  language,
  created_by
)
values (
  '11111111-1111-1111-1111-111111111111',
  'html-css-fundamentals',
  'HTML & CSS Fundamentals',
  'Learn the building blocks of the web: HTML structure and CSS styling '
  'from scratch. Perfect for absolute beginners.',
  'beginner',
  'published',
  'en',
  (
    select user_id
    from public.user_roles
    where role = 'instructor'
    limit 1
  )
),
(
  '22222222-2222-2222-2222-222222222222',
  'javascript-crash-course',
  'JavaScript Crash Course',
  'A fast-paced introduction to JavaScript: variables, functions, DOM '
  'manipulation, async patterns, and modern ES6+ syntax.',
  'intermediate',
  'published',
  'en',
  (
    select user_id
    from public.user_roles
    where role = 'instructor'
    limit 1
  )
)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Course prices (paid course only; HTML/CSS is free - no price row)
-- ---------------------------------------------------------------------------
insert into public.course_prices (
  course_id,
  display_label,
  currency,
  amount_cents,
  is_active
)
values (
  '22222222-2222-2222-2222-222222222222',
  'One-time access - demo price',
  'USD',
  4900,
  true
)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Lessons: HTML & CSS Fundamentals
-- YouTube IDs are real public freeCodeCamp tutorial videos.
-- ---------------------------------------------------------------------------
insert into public.lessons (
  id,
  course_id,
  slug,
  title,
  description,
  youtube_video_id,
  youtube_url,
  duration_seconds,
  thumbnail_url,
  sort_order,
  is_preview
)
values
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'intro-to-html',
  'Introduction to HTML',
  'What is HTML, how browsers parse it, and your first webpage.',
  'pQN-pnXPaVg',
  'https://www.youtube.com/watch?v=pQN-pnXPaVg',
  14400,
  'https://img.youtube.com/vi/pQN-pnXPaVg/hqdefault.jpg',
  1,
  true
),
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '11111111-1111-1111-1111-111111111111',
  'html-forms-and-tables',
  'HTML Forms and Tables',
  'Build accessible forms and structured data tables.',
  'PlxWf493en4',
  'https://www.youtube.com/watch?v=PlxWf493en4',
  5400,
  'https://img.youtube.com/vi/PlxWf493en4/hqdefault.jpg',
  2,
  false
),
(
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '11111111-1111-1111-1111-111111111111',
  'css-basics-and-selectors',
  'CSS Basics and Selectors',
  'Box model, specificity, and the cascade explained.',
  'yfoY53QXEnI',
  'https://www.youtube.com/watch?v=yfoY53QXEnI',
  7200,
  'https://img.youtube.com/vi/yfoY53QXEnI/hqdefault.jpg',
  3,
  false
)
on conflict (course_id, slug) do nothing;

-- ---------------------------------------------------------------------------
-- Lessons: JavaScript Crash Course
-- YouTube IDs from well-known Traversy Media / freeCodeCamp JS tutorials.
-- ---------------------------------------------------------------------------
insert into public.lessons (
  id,
  course_id,
  slug,
  title,
  description,
  youtube_video_id,
  youtube_url,
  duration_seconds,
  thumbnail_url,
  sort_order,
  is_preview
)
values
(
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  '22222222-2222-2222-2222-222222222222',
  'js-variables-and-types',
  'Variables and Data Types',
  'var, let, const, primitives, and type coercion.',
  'hdI2bqOjy3c',
  'https://www.youtube.com/watch?v=hdI2bqOjy3c',
  6300,
  'https://img.youtube.com/vi/hdI2bqOjy3c/hqdefault.jpg',
  1,
  true
),
(
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  '22222222-2222-2222-2222-222222222222',
  'js-functions-and-scope',
  'Functions and Scope',
  'Declaration vs expression, arrow functions, closures, lexical scope.',
  'W6NZfCO5SIk',
  'https://www.youtube.com/watch?v=W6NZfCO5SIk',
  4500,
  'https://img.youtube.com/vi/W6NZfCO5SIk/hqdefault.jpg',
  2,
  false
),
(
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  '22222222-2222-2222-2222-222222222222',
  'js-dom-manipulation',
  'DOM Manipulation',
  'Selecting elements, event listeners, and updating the page dynamically.',
  '5fb2aPlgoys',
  'https://www.youtube.com/watch?v=5fb2aPlgoys',
  5700,
  'https://img.youtube.com/vi/5fb2aPlgoys/hqdefault.jpg',
  3,
  false
)
on conflict (course_id, slug) do nothing;

-- ---------------------------------------------------------------------------
-- Class group (sample; not tied to specific auth users)
-- ---------------------------------------------------------------------------
insert into public.class_groups (
  id,
  slug,
  name,
  created_by
)
values (
  'a0000000-0000-0000-0000-000000000001',
  'cohort-alpha-2026',
  'Cohort Alpha 2026',
  (
    select user_id
    from public.user_roles
    where role = 'instructor'
    limit 1
  )
)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Sample enrollment for seeded students (no-ops when auth users absent)
-- Seeds: E2E_STUDENT_EMAIL user in the HTML/CSS course if they exist.
-- ---------------------------------------------------------------------------
insert into public.enrollments (user_id, course_id)
select
  u.id,
  '11111111-1111-1111-1111-111111111111'
from auth.users u
where u.email = current_setting('app.e2e_student_email', true)
  and current_setting('app.e2e_student_email', true) <> ''
  and exists (
    select 1 from public.profiles p where p.user_id = u.id
  )
on conflict (user_id, course_id) do nothing;
