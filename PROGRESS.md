# Tutr Daily Progress Log

This file tracks the day-by-day development of Tutr. The initial entries were
reconstructed from workspace file timestamps because the repository did not yet
have commit history. Future entries can be added at the end of the log as a
lightweight daily standup.

Tutr has been developed with Codex assistance: product ideas were described in
prompts, then implemented, reviewed, and verified iteratively.

## 2026-05-05 - MVP Foundation

### Completed

- Started the Tutr project with a Spring Boot backend, React frontend, and
  PostgreSQL database.
- Added the first Flyway migration for users, tutor profiles, students, lessons,
  and enquiries.
- Implemented JWT registration and login.
- Added the initial tutor marketplace APIs, student management APIs, lesson
  status types, and enquiry workflow.
- Added the first frontend API clients, shared form components, protected
  routes, and base application providers.

### Outcome

Tutr had its first working full-stack foundation for tutor accounts, students,
lessons, and parent enquiries.

## 2026-05-06 - Profiles And Deployment Setup

### Completed

- Added public tutor profile editing and publishing controls.
- Added profile image upload support.
- Added public tutor search cards and tutor profile types.
- Added backend web configuration and managed Postgres environment setup.

### Outcome

Tutors could maintain a public-facing profile and the project could be
configured for local or managed PostgreSQL environments.

## 2026-05-29 - Calendar Sync And Recurring Lessons

### Completed

- Added Google Calendar OAuth connection support.
- Added lesson-to-Google-Calendar synchronization and deletion sync.
- Added recurring lesson series with weekly recurrence settings.
- Added Google Meet links, Miro board links, and lesson invite email fields.
- Added local development configuration and repeatable sample data setup.
- Added the public landing page and shared visual styling.

### Outcome

Lesson scheduling became practical for regular tutoring workflows and could
optionally stay in sync with a tutor's Google Calendar.

## 2026-05-30 - Tutor Dashboard Pages

### Completed

- Added the login and registration pages.
- Added the enquiry inbox with status updates.
- Added tutor profile settings.
- Added student management screens.
- Added public tutor search and tutor profile pages.
- Improved API error handling in the frontend.

### Outcome

The core tutor and parent-facing screens were connected into a usable
application flow.

## 2026-06-01 - Lesson Workflow And Income Analytics

### Completed

- Added the weekly lesson calendar with vertically scrollable content and
  readable lesson cards.
- Added quick lesson status and payment status updates directly on calendar
  cards.
- Avoided unnecessary shared Google Calendar updates when only internal payment
  or lesson statuses change.
- Defaulted new lessons to Google Calendar sync when available.
- Auto-filled hourly rate, invite email, and calendar title from the selected
  student.
- Added lesson start and end times, calculated lesson amounts, and cleaner card
  styling.
- Added paginated, sortable, searchable, and expandable-filter lesson history.
- Added the earnings page with total earnings, total hours, average hourly rate,
  weekly income rows, and stable pagination.
- Added overview income periods for daily, weekly, monthly, and yearly views,
  with a persistent user preference.
- Added expected, paid, and outstanding income tracking with stacked chart bars
  and hover tooltips.
- Included paid cancellations in earnings to support cancellation policies.
- Corrected analytics date grouping to use `Australia/Sydney`, matching the
  lesson calendar.
- Expanded Sarah Chen's repeatable seed data with linked students and lesson
  history dating back to 2024.

### Outcome

Tutr now supports fast day-to-day lesson administration and a useful financial
overview for independent tutors.

## 2026-06-02 - Calendar Views, Enquiries, And Mobile Refinement

### Completed

- Split lessons into dedicated calendar and table workspaces while keeping the
  add-lesson action easy to reach.
- Added daily, weekly, and monthly calendar views inspired by familiar calendar
  tools.
- Made the daily and weekly calendars independently scrollable so larger
  schedules remain manageable.
- Added start and end times plus editable lesson and payment statuses to the
  daily view.
- Added clearer weekly lesson cards with hourly rates, edit actions, and delete
  actions.
- Added monthly lesson hover details and a focused lesson modal with editable
  statuses and deletion support.
- Standardized calendar highlight colors across all views: grey for scheduled
  lessons, green for paid non-scheduled lessons, yellow for partial payments,
  and red for overdue unpaid lessons.
- Removed distracting green hover styling from calendar cards and status
  dropdowns.
- Improved the overview income-chart hover card for expected, paid, and
  outstanding amounts while removing the chart's grey bar background.
- Fixed enquiry loading by keeping the enquiry read transaction open while
  related data is mapped.
- Added more local Sarah Chen enquiry sample data and refined the enquiry-card
  layout.
- Improved mobile responsiveness across the dashboard shell and the main tutor
  and public-facing pages.

### Outcome

Tutors can move between schedule views, lesson history, enquiries, and the
dashboard more comfortably on both desktop and mobile. Calendar cards now make
payment state and follow-up work easier to understand at a glance.

### Next

- Add one-click enquiry-to-student conversion with optional first-lesson
  scheduling.
- Expand payment tracking into a ledger with exact partial-payment amounts,
  due dates, and outstanding balances.
- Add configurable lesson and overdue-payment reminders.
- Add tutor availability blocks and scheduling conflict detection.
- Build a consolidated student overview with lessons, notes, homework, and
  balances.

## 2026-06-03 - Beta Deployment And Earnings Import Polish

### Completed

- Prepared the MVP for beta deployment on Render using separate free backend
  and frontend services.
- Connected the deployed frontend to the Render backend API and fixed the
  deployed tutor-search empty state behavior.
- Moved mock/local seed data out of automatic startup and into
  `backend/scripts/seed-local-data.sql`, so local and dev databases can start
  empty unless the seed script is run.
- Documented the local reset flow for starting with an empty database and
  loading sample data only when needed.
- Added historical earnings CSV import for tutors moving old weekly earnings
  from spreadsheets into Tutr.
- Added actual earnings CSV export from the user's current earnings table, with
  timestamped filenames and empty-table handling.
- Added a clearer CSV export icon and refined the historical earnings import
  panel and modal.
- Added a safe import replacement flow so tutors can fix a previous upload by
  replacing imported history without touching Tutr lesson records.
- Hardened CSV validation with all-or-nothing imports, strict weekly
  Monday-to-Sunday rows, real dates, no blank values, non-negative numeric
  hours and income, duplicate-week rejection, and guardrails for unusually large
  values.
- Kept CSV validation errors inside the import modal with upload progress and
  row snippets that identify the problematic CSV values.
- Added earnings filters for all time, recorded year, and recorded month, with
  totals, pagination, and CSV export following the selected range.
- Clarified Google Calendar OAuth deployment settings, including the production
  redirect URI for Render.

### Outcome

Tutr is closer to beta-ready: deployed services behave more like local
development, local sample data is no longer baked into every database startup,
and tutors can safely bring in spreadsheet-based earning history, fix mistakes,
filter earnings by recorded period, and export the exact view they are seeing.

### Next

- Rotate exposed Google OAuth credentials before broader beta testing.
- Smoke-test the Render beta after each deploy: auth, tutor search, profile
  publishing, lessons, earnings import/export, and Google Calendar connect.
- Add one-click enquiry-to-student conversion with optional first-lesson
  scheduling.
- Expand payment tracking into a ledger with exact partial-payment amounts,
  due dates, and outstanding balances.
- Add configurable lesson and overdue-payment reminders.

## 2026-06-04 - Calendar Controls And Avatar Resilience

### Completed

- Refined lesson calendar form controls and visual polish across dashboard and
  public pages.
- Added Google Calendar color support for lessons and series.
- Improved recurring lesson deletion flows, including backend endpoints and
  frontend delete choices.
- Made tutor avatars more resilient with a shared avatar component and cleaner
  fallbacks across cards, profile pages, and settings.
- Simplified the health endpoint response while keeping it suitable for hosted
  platform checks.

### Outcome

Lesson editing and recurring deletion became clearer, calendar sync metadata
became richer, and public tutor/profile imagery handled missing or broken
images more gracefully.

## 2026-06-05 - Hosted Beta Polish And UI Refactor

### Completed

- Fixed Google Calendar deletion sync so removed lessons and recurring series
  are handled more reliably.
- Added Supabase-backed profile image storage configuration and service support.
- Added the initial GitHub Actions workflow for pinging the Render API health
  endpoint on a schedule.
- Refactored the dashboard UI toward shared Material UI patterns, splitting the
  lessons workspace into smaller components for forms, tables, dialogs, Google
  Calendar status, constants, and helpers.
- Improved lesson flows with custom lesson links, tutor profile year support,
  and more complete lesson form/table behavior.
- Improved public tutor search and authentication page flows.
- Fixed weekly lesson card status layout after the UI refactor.

### Outcome

The hosted beta became more production-shaped: profile images could move to
Supabase storage, the API gained scheduled keep-awake support, calendar deletion
sync was safer, and the frontend moved toward more consistent reusable UI
structure.

## 2026-06-06 - Render Keep-Awake Stabilization

### Completed

- Updated the GitHub Actions keep-awake workflow so a missing
  `TUTR_API_HEALTH_URL` repository variable creates a notice instead of a
  repeated scheduled failure.
- Increased the Render API health ping timeout and retry window to better
  tolerate free-tier cold starts after periods with no traffic.
- Verified the deployed backend health endpoint at
  `https://tutr-api.onrender.com/api/v1/health` returns `204 No Content`.
- Pushed the workflow update to `main`.

### Outcome

The scheduled keep-awake job is less noisy and more resilient when the Render
backend needs extra time to wake after being idle.

## 2026-06-08 - Google Calendar Inbound Sync

### Completed

- Added backend support for syncing changed Google Calendar events back into
  Tutr lessons.
- Added an explicit calendar sync endpoint and frontend API helper.
- Updated the lessons page to run calendar sync when connected, including a
  short session-based cooldown to avoid excessive repeated syncs.
- Refined the Google Calendar panel copy and sync status handling.

### Outcome

Tutors could make schedule changes in Google Calendar and have those updates
flow back into Tutr, reducing the chance that the app and calendar drift apart.

## 2026-06-10 - Profile Structure And Beta Feedback

### Completed

- Hardened automatic Google Calendar event syncing so linked lesson updates
  and calendar metadata stay more reliable.
- Fixed revenue chart tooltip clipping so financial details remain readable.
- Added structured tutor teaching-offering data, including backend persistence,
  DTO support, and Flyway migrations.
- Added high school and university education fields to tutor profiles.
- Added dashboard profile controls for teaching years, subjects, high school,
  university, study area, and ATAR.
- Surfaced the new education and teaching-offering details on public tutor
  profile and search pages.
- Added GitHub issue templates for beta bug reports and feature requests.
- Added a beta feedback link to the dashboard and documented the feedback flow
  in the README.

### Outcome

Tutor profiles became more structured and searchable, earnings charts were
easier to read, calendar sync was safer, and beta testers gained a clearer path
for reporting problems and feature ideas.

## 2026-06-14 - Subject Selection And Lesson Filtering

### Completed

- Renamed tutor-facing labels from "years" to clearer "year levels" across the
  dashboard and public tutor pages.
- Added searchable year-level and subject selection in profile settings, with
  clearer labels for primary-school offerings.
- Reworked student setup so tutors choose a year level first, then select one
  or more subjects from the matching subject list.
- Updated lesson title generation so multi-subject students can use a specific
  lesson subject while still allowing custom lesson titles.
- Added lesson filters for search, student, year level, subject, lesson status,
  and payment status across the calendar and table workspaces.
- Surfaced student year level, subjects, Google Meet links, and attached lesson
  links in daily, weekly, and monthly lesson views.
- Updated local seed data and README login details from the Sarah Chen sample
  account to the Edward Lukman sample account.
- Pointed dashboard brand links back to the tutor dashboard instead of the
  public home page.

### Outcome

Tutors can manage students with multiple subjects more cleanly, narrow lesson
views to the work they need, and jump into lesson calls or attached resources
directly from the calendar.

### Next

- Run a frontend typecheck/build after the UI changes are finalized.
- Smoke-test student creation, profile subject selection, lesson filtering, and
  lesson link display on desktop and mobile.
- Consider whether the lesson filters should persist between dashboard visits.

## 2026-06-15 - Codebase Onboarding And Backend Package Refactor

### Completed

- Added a standalone `codebase-map.html` onboarding guide with architecture,
  system design, data-flow diagrams, route/API summaries, data model notes, and
  change-location guidance for new developers.
- Refactored backend Java packages from feature-first folders into clearer
  role-based layers: `controller`, `service`, `dto`, `entity`, `repository`,
  `enums`, and `converter`.
- Updated backend package declarations and imports to match the new folder
  structure while keeping `config` and `common` for cross-cutting code.
- Updated README project structure and the codebase map so documentation
  reflects the new backend organization.
- Verified the backend still compiles with `./mvnw -DskipTests package`.

### Outcome

New developers now have a visual map of how Tutr works, and the backend is
organized around the types of code they will usually look for first: APIs,
services, DTOs, entities, repositories, and enums.

### Next

- Start local Postgres before running the full backend test suite, because the
  current Spring context test still expects a database on `localhost:5432`.
- Update any IDE bookmarks or open-file references that still point to the old
  backend feature package paths.

## 2026-06-20 - Dashboard Calendar And Mobile Polish

### Completed

- Refined the lesson form experience with expandable notification controls,
  cleaner dropdown alignment, and less distracting form highlights.
- Removed partial payment from active lesson payment choices and standardized
  unpaid lessons on yellow styling.
- Reworked lesson detail modal content so generated student/year/subject titles
  are not repeated, while custom titles still appear clearly.
- Split the large lessons page by extracting the calendar and lesson-detail UI
  into `LessonCalendar.tsx`.
- Added persistent lesson calendar view preference so daily, weekly, or monthly
  stays selected between visits.
- Redesigned the daily lesson view into a timeline-style layout with lesson
  cards, free-time dividers, actual notes/homework content, meeting/resource
  actions, and light grey calendar background styling.
- Improved weekly and monthly calendar contrast, today labelling, card colors,
  and lesson modal presentation.
- Made lessons search and filters expandable on mobile.
- Improved enquiry card spacing on mobile so conversion and status controls are
  easier to scan and tap.
- Made earnings filters expandable on mobile and added a labelled mobile
  `Export CSV` action while keeping the desktop tooltip/icon behavior.
- Added a reusable delete confirmation dialog and applied it to students,
  enquiries, and lessons, with entity-specific confirmation messages and
  recurring lesson delete choices preserved.
- Removed daily income bars from the revenue chart so the income-over-time view
  focuses on more meaningful periods.
- Added recurring lesson deletion choices for single event, following events,
  or full series.
- Added a scheduled keep-awake workflow for the hosted Render backend and
  documented the Render free-tier trade-off.
- Added Supabase storage support planning/configuration for long-term tutor
  profile image persistence.

### Outcome

The dashboard feels more mobile-friendly and production-ready: lesson calendar
views are easier to read, filters take less space on small screens, earnings
controls are clearer, recurring deletions are safer, and hosted beta
infrastructure is better prepared for free-tier limitations and persistent
profile media.

### Next

- Smoke-test the lesson calendar daily, weekly, and monthly views on mobile and
  desktop after deployment.
- Finish and verify the Supabase storage path for uploaded tutor profile
  images in production.
- Revisit exact payment tracking only after the current simplified paid/unpaid
  workflow has been beta-tested.

## 2026-06-26 - Render Cron Keep-Awake

### Completed

- Confirmed the existing hosted keep-awake setup used a GitHub Actions schedule
  that pinged the public backend health endpoint.
- Added a Render Blueprint cron service named `tutr-api-keep-awake` that runs
  every 10 minutes.
- Added `scripts/keep_api_awake.py` to ping `TUTR_API_HEALTH_URL` with standard
  Python libraries so the cron job does not depend on curl or the backend Java
  image.
- Set the Render cron environment variable to
  `https://tutr-api.onrender.com/api/v1/health`.
- Updated deployment docs to explain the Render cron service and the existing
  GitHub Actions workflow as a fallback.
- Verified the Python keep-awake script handles a missing URL safely and
  succeeds against the deployed health endpoint with `204 No Content`.
- Confirmed `render.yaml` parses successfully after adding the cron service.

### Outcome

Tutr now has a Render-managed keep-awake cron job in the deployment Blueprint,
with the earlier GitHub Actions schedule still available as a fallback. The
hosted API should be less likely to go fully cold between beta sessions, while
the health ping remains lightweight and unauthenticated.

### Next

- Sync the updated Blueprint in Render and confirm the `tutr-api-keep-awake`
  service is created successfully.
- Decide whether to leave the GitHub Actions keep-awake variable unset to avoid
  duplicate scheduled pings.
- Monitor the first few Render cron runs and check whether the 10-minute
  interval is enough for the free-tier idle window.

## Current Focus

- Stabilize the beta deployment and verify the full hosted workflow after each
  Render deploy.
- Protect production credentials and keep local/dev data flows repeatable.
- Connect enquiries to the student-management workflow with one-click
  conversion.
- Add exact partial-payment amounts, due dates, and outstanding balances before
  expanding income reporting further.
- Add reminders and availability checks before investing more deeply in tutor
  ad listings.

## Daily Standup Template

```md
## YYYY-MM-DD - Short Theme

### Completed

- What changed?

### Outcome

What became easier or more useful for the user?

### Next

- What should be considered next?
```
