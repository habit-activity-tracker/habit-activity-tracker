# Issue 106 — Sprint 3 F-11 reminder schedules

## Scope

Implements the reviewed S3-F11-R contract from Issue 105. A Participant can create and list up to three persisted reminder schedules for an owned active goal. The API computes `next_occurrence_at` in `APP_TIMEZONE`; it does not send notifications or create delivery jobs.

## Traceability

| Item | Value |
|---|---|
| Contract | `docs/deliverable-2/contracts/sprint-3/S3-F11-R-reminder-schedules.md` |
| Base | `d2-staging` at `d757015` (contract PR #119) |
| Branch | `feature/s3-f11-reminders` |
| Migration | `007-reminder-schedules.sql` |
| API routes | `POST/GET /api/goals/:id/reminder-schedules` |

## Verification

Focused API tests:

```text
npm run test:api -- reminder-schedules.test.ts
Test Suites: 1 passed, 1 total
Tests: 6 passed, 6 total
```

The focused tests cover owner persistence/reload, input validation without persistence, the three-schedule limit, ended goals, strict-future occurrence calculation, and 401/403/404 access behavior.

Full local verification:

```text
npm run build
Build passed for API and Web.

npm run test:unit
Test Suites: 6 passed, 6 total
Tests: 18 passed, 18 total

npm run test:api
Test Suites: 14 passed, 14 total
Tests: 79 passed, 79 total
```

The UI adds a focused Reminders section to the goal page with local-time input, weekday selection, enabled state, saved schedule list, next occurrence, empty state, and a three-row limit. No update, delete, notification, queue, email, push, or provider integration is included.

## Remaining verification

- Partner review and PR CI.
- Partner runs the focused workflow on a separate machine.
- Capture UI/API screenshots for one successful create, one validation rejection, access-control responses, and persisted data after reload.
