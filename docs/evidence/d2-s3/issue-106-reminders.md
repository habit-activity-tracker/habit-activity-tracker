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

---

## Reviewer verification (Chayanit) — Part B/C reviewer for Issue #106 / PR #120

**Machine:** macOS (local), Node via npm workspaces  
**Date/time:** 2026-11-25  
**Commit reviewed:** `48703c5` (branch `feature/s3-f11-reminders`)  
**Postgres:** Docker Compose `postgres:16-alpine`, host port `5433` → container `5432`  
**Test DB:** `TEST_DATABASE_URL=postgresql://habit:habit@localhost:5433/habit_tracker` (synthetic accounts only)

### Commands executed and results

| Command | Result |
|---|---|
| `npm run build` | API and Web passed |
| `npm run test:unit` | 6 suites, 18 passed |
| `npm run test:api` | 14 suites, 79 passed |
| `npm run test:api -- reminder-schedules.test.ts` | 6 passed (TEST-S3-01, 03, 04, 05, 07, 08) |
| CI check on PR #120 | Passed |

### Contract compliance (verified against code + tests)

| Checklist item | Result | Reference |
|---|---|---|
| POST/GET `/api/goals/:id/reminder-schedules` | ✅ | `api/src/routes/goals.routes.ts` |
| Validation + `INVALID_REMINDER_SCHEDULE` (400) | ✅ | `api/src/validators/reminder.ts`, TEST-S3-03 |
| 401 → 403 → 404 ordering (`SESSION_REQUIRED` → `ROLE_FORBIDDEN` → `GOAL_NOT_FOUND`) | ✅ | `api/src/middleware/auth.ts`, `goalOwnership.ts`, TEST-S3-08 |
| Max 3 schedules incl. disabled → `REMINDER_SCHEDULE_LIMIT_REACHED` (409) | ✅ | TEST-S3-04 (row lock + transaction) |
| `next_occurrence_at` strict-future, injectable clock, `APP_TIMEZONE` | ✅ | `api/src/services/reminders.ts`, TEST-S3-01/05/07 |
| Migration additive only (`007-reminder-schedules.sql`) | ⚠️ | `CREATE TABLE IF NOT EXISTS` + index; no change to existing data. Rollback is not supported by the current migration runner; rollback note is documented. |
| No notification/queue/provider call | ✅ | Service, routes, and `web/src/components/ReminderSection.tsx` |

### Manual workflow test cases to capture (as Alice)

- Create `{local_time:'08:30', days_of_week:[1,3,5]}` → `201`, `next_occurrence_at` set, days normalized `[1,3,5]`
- Reload `GET` → `200`, 1 schedule, data persists
- Invalid payload `{local_time:'24:00'}` → `400`, no row persisted
- 4th schedule → `409`, `REMINDER_SCHEDULE_LIMIT_REACHED`
- Not logged in → `401`; PM → `403`; Bob on Alice's goal → `404` (no ownership leak)

### Reviewer verdict

All contract items from Issue #105 are implemented. Automated tests pass; manual workflow evidence remains pending. TDD evidence is recorded in PR #120 commit history. **PR #120 is approved.** I have **not** merged it — merge into `d2-staging` is left to Chayanit to perform.

No real passwords, tokens, or secrets in this evidence or in the code under review.

Signed: Chayanit (reviewer), 2026-11-25
