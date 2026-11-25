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

## Manual workflow evidence (Chayanit local review)

**Environment:** macOS local development; `APP_TIMEZONE=Asia/Bangkok`; synthetic seeded accounts only.

**Branch/commit:** `feature/s3-f11-reminders` / `8774ded` (`fix: align reminder form controls`).
**Date:** 2026-11-25.

| Evidence | Observed result |
|---|---|
| Alice active goal | `Pages Read`, target `100`, goal period `2026-11-25` to `2026-12-31`; the goal is active. |
| Create and display | The Reminders UI confirms the `08:30 ICT` Monday/Wednesday/Friday schedule was saved. |
| Persistence after reload | Reloaded UI continued to list the saved `08:30 ICT` Monday/Wednesday/Friday schedule. |
| Successful API create | `POST /api/goals/:id/reminder-schedules` with `{ "local_time": "09:00", "days_of_week": [2] }` returned `HTTP 201`; the response contains `enabled: true` and `next_occurrence_at: "2026-12-01T02:00:00.000Z"`. |
| Invalid payload / no persistence | A before/after `GET` around `POST { "local_time": "24:00", "days_of_week": [1] }` showed the same schedule list. The POST returned `HTTP 400`, `INVALID_REMINDER_SCHEDULE`, and `details.local_time: "Local time must use HH:MM format."` |
| Schedule cap | After three schedules existed, a fourth create returned `HTTP 409` with `REMINDER_SCHEDULE_LIMIT_REACHED`. |
| Authentication and ownership order | Unauthenticated list returned `HTTP 401` / `SESSION_REQUIRED`; Program Manager returned `HTTP 403` / `ROLE_FORBIDDEN`; Bob reading Alice's goal returned `HTTP 404` / `GOAL_NOT_FOUND`. |

### Captured screen evidence

![Alice's active Pages Read goal, ending on 2026-12-31.](./01-active-goal.png)

*Figure 1. Alice's active goal before creating reminder schedules.*

![Saved reminder display showing 08:30 ICT on Monday, Wednesday, and Friday.](./03-persistence-after-reload.png)

*Figure 2. The reminder UI confirms the Monday/Wednesday/Friday schedule was saved.*

![Reloaded reminder UI still lists the persisted reminder schedule.](./02-create-and-next-occurrence.png)

*Figure 3. Reloaded UI confirms reminder persistence.*

![Terminal evidence of invalid 24:00 input returning INVALID_REMINDER_SCHEDULE and HTTP 400, with unchanged GET results.](./04-invalid-payload.png)

*Figure 4. Invalid `24:00` local time is rejected with `400 INVALID_REMINDER_SCHEDULE`; GET before and after is unchanged.*

![Terminal evidence of a fourth reminder returning REMINDER_SCHEDULE_LIMIT_REACHED and HTTP 409.](./05-three-schedule-limit.png)

*Figure 5. A fourth reminder is rejected with `409 REMINDER_SCHEDULE_LIMIT_REACHED`.*

![Terminal evidence of 401 SESSION_REQUIRED, 403 ROLE_FORBIDDEN, and 404 GOAL_NOT_FOUND.](./06-access-control.png)

*Figure 6. Authentication, role, and ownership ordering: `401`, `403`, then privacy-safe `404`.*

![Focused reminder-schedules API test result: 1 suite and 6 tests passed.](./07-focused-tests.png)

*Figure 7. Focused reminder API suite passes: 1 suite, 6 tests.*

![GitHub pull-request checks show one approval and a successful CI and Docker Build check.](./08-ci-green.png)

*Figure 8. PR #120 has one approval and a successful CI & Docker Build check.*

## Final verification

- Focused command `npm run test:api -- reminder-schedules.test.ts`: 1 suite and 6 tests passed (Figure 7).
- PR #120 CI & Docker Build check: passed (Figure 8).

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

### Manual workflow cases captured (as Alice)

- Create `{local_time:'08:30', days_of_week:[1,3,5]}` → `201`, `next_occurrence_at` set, days normalized `[1,3,5]`
- Reload `GET` → `200`, 1 schedule, data persists
- Invalid payload `{local_time:'24:00'}` → `400`, no row persisted
- 4th schedule → `409`, `REMINDER_SCHEDULE_LIMIT_REACHED`
- Not logged in → `401`; PM → `403`; Bob on Alice's goal → `404` (no ownership leak)

### Reviewer verdict

All contract items from Issue #105 are implemented. Automated tests pass, and the manual workflow evidence is captured above. TDD evidence is recorded in PR #120 commit history. **PR #120 is approved.** I have **not** merged it — merge into `d2-staging` is left to Chayanit to perform.

No real passwords, tokens, or secrets in this evidence or in the code under review.

Signed: Chayanit (reviewer), 2026-11-25
