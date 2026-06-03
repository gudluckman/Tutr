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

## Current Focus

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
