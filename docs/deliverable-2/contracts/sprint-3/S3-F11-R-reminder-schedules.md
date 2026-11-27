# S3-F11-R — Reminder schedules and next occurrence

## Version history

| Version | Date | Author | Reviewer | Change |
|---|---|---|---|---|
| v1.0 | 25 November 2026 | Chayanit Kuntanarumitkul | Kulchaya Paipinij | Initial Sprint 3 implementation contract. |

## Status, requirements, and scope boundary

**Status:** `planned` — this contract must be reviewed and merged before Issue 9 implementation starts.

- **Feature / requirements:** F-11, FR-16, BR-11, NFR-02, NFR-05.
- **Decisions:** AD-15 and AD-17: a reminder is persisted schedule representation only. The system must not send an email, push notification, webhook, queue job, or provider request.
- **Dependencies:** D2-GATE-01; S2-F04-R's stable `goal_id` and its ended-goal decision.
- **No version mutation:** a schedule belongs to the stable `goal_id`, not a `goal_revisions` row. Revising a goal creates a new goal revision; it never rewrites a schedule or its historical row.

## Domain workflow and occurrence rule

An owner Participant selects one owned, currently active goal, chooses a local clock time and one or more ISO weekdays, then creates a persisted schedule. The owner can reload the goal's schedules and sees a computed `next_occurrence_at`. Calculation is read-only and uses an injected clock in `APP_TIMEZONE` (default `Asia/Bangkok`).

1. A goal may receive at most three schedules. Create is rejected when the goal already has three, whether or not an existing schedule is disabled.
2. `days_of_week` is a non-empty array of unique ISO values `1` (Monday) through `7` (Sunday). The API returns the values in ascending numeric order.
3. `local_time` is an exact `HH:MM` 24-hour local time (`00:00` through `23:59`); seconds and timezone offsets are not accepted or stored.
4. The first candidate occurrence is the earliest selected weekday/local-time strictly after the injected current instant. If today's selected time equals `now`, it is already elapsed and the next selected day is used. Calendar arithmetic is in `APP_TIMEZONE`, so midnight and Sunday-to-Monday boundaries are calendar boundaries, not 24-hour elapsed-duration guesses.
5. `next_occurrence_at` is `null` when `enabled=false`, when the current goal `end_date` is before today in `APP_TIMEZONE`, or when the calculated local candidate is after the goal's inclusive `end_date`. The schedule remains readable and unchanged.
6. An owner may create a schedule only when the goal's `end_date` is today or later in `APP_TIMEZONE`. A later S2-F04-R revision that shortens the end date to before today leaves schedule rows untouched but makes subsequent reads return `next_occurrence_at: null`.
7. This Sprint deliberately includes **create and list only**. `PATCH`, delete, enable/disable update, and re-enable are not in scope. A disabled schedule may be represented at creation but cannot be re-enabled in this Sprint; a future contract must add an owner-scoped update lifecycle before enabling that behavior.

## Data, migration, and persistence contract

Issue 9 adds a forward migration (expected name `007-reminder-schedules.sql`); its down/reversal instructions must remove only `reminder_schedules` and its index. Existing goal, revision, record, template, and user rows are unchanged.

```sql
CREATE TABLE reminder_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  local_time TIME NOT NULL,
  days_of_week SMALLINT[] NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT reminder_schedules_days_nonempty CHECK (cardinality(days_of_week) BETWEEN 1 AND 7),
  CONSTRAINT reminder_schedules_days_range CHECK (days_of_week <@ ARRAY[1,2,3,4,5,6,7]::SMALLINT[])
);
CREATE INDEX reminder_schedules_goal_id_idx ON reminder_schedules(goal_id);
```

The service validates uniqueness and ascending normalization of `days_of_week` before insert; PostgreSQL array range checks alone cannot prevent duplicates. It checks the per-goal limit within a transaction that locks the goal row, so concurrent fourth creates cannot bypass the limit. `next_occurrence_at` is computed at read time and is **not** a database column.

## API contract

### `POST /api/goals/:id/reminder-schedules`

Creates one schedule for an owned active goal.

```json
{
  "local_time": "08:30",
  "days_of_week": [1, 3, 5],
  "enabled": true
}
```

`enabled` is optional and defaults to `true`. Unknown fields are rejected. `201 Created` returns:

```json
{
  "schedule": {
    "id": "uuid",
    "goal_id": "uuid",
    "local_time": "08:30",
    "days_of_week": [1, 3, 5],
    "enabled": true,
    "next_occurrence_at": "2026-11-25T01:30:00.000Z",
    "created_at": "2026-11-24T17:30:00.000Z",
    "updated_at": "2026-11-24T17:30:00.000Z"
  }
}
```

The timestamp is UTC ISO-8601; the local decision uses `APP_TIMEZONE`. The response must not claim that delivery has been scheduled.

### `GET /api/goals/:id/reminder-schedules`

Returns only the owner's schedules, ordered by `created_at ASC, id ASC`:

```json
{ "schedules": [{ "id": "uuid", "goal_id": "uuid", "local_time": "08:30", "days_of_week": [1,3,5], "enabled": true, "next_occurrence_at": null, "created_at": "...", "updated_at": "..." }] }
```

An empty owner list is `200 { "schedules": [] }`. Reload recalculates `next_occurrence_at`; it does not update the row.

### Access, error shape, and check order

Both routes retain the global error shape `{ "error": { "code", "message", "details" } }` and enforce AD-14 ordering: `401` → `403` → `404` → route/payload validation → domain conflict.

| Status | Code | Condition |
|---:|---|---|
| 401 | `SESSION_REQUIRED` | Missing, invalid, or expired session. |
| 403 | `ROLE_FORBIDDEN` | Authenticated Program Manager. |
| 404 | `GOAL_NOT_FOUND` | Unknown goal or another Participant's goal; no existence leak. |
| 400 | `INVALID_GOAL_ID` | Malformed route UUID, after authorization checks. |
| 400 | `INVALID_REMINDER_SCHEDULE` | Invalid/missing time, non-array/empty/duplicate/out-of-range weekdays, non-boolean `enabled`, or unknown field. |
| 409 | `GOAL_ENDED` | Owner goal ended before today in `APP_TIMEZONE`; no row is added. |
| 409 | `REMINDER_SCHEDULE_LIMIT_REACHED` | Goal already has three schedules; no fourth row is added. |

## Focused UI path

The owner goal detail page exposes a **Reminders** section. It loads the owner-scoped list, displays local time, selected weekdays, enabled state, and “Next occurrence” (or “No upcoming occurrence” for `null`). The create form has a time control, weekday multi-select, enabled checkbox, inline validation, submit loading state, successful append/reload, empty state, and generic safe error state. It offers no update, delete, or notification-sending control. Manager/cross-owner routes must not render schedule data.

## Acceptance criteria

| ID | Observable outcome |
|---|---|
| **AC-S3-01** | An owner creates a valid schedule; reload returns the same persisted fields and one schedule row. |
| **AC-S3-02** | A schedule can be created/listed only for the authenticated Participant's own goal. |
| **AC-S3-03** | `local_time`, unique ISO weekdays, and `enabled` are validated; invalid payload does not persist a row. |
| **AC-S3-04** | A goal accepts at most three schedules; each schedule has one to seven unique weekdays. |
| **AC-S3-05** | Creation for a goal ended before today is rejected; an existing schedule remains readable with `next_occurrence_at: null` after a goal ends. |
| **AC-S3-06** | `next_occurrence_at` is deterministic from persisted schedule data, injected clock, and `APP_TIMEZONE`, strictly after now, without mutating persistence. |
| **AC-S3-07** | Midnight and week rollover choose the correct next selected local weekday/time. |
| **AC-S3-08** | Missing session is `401`, Program Manager is `403`, and another Participant is `404`, with no private schedule/goal body. |
| **AC-S3-09** | No notification dispatch, provider call, queue job, email, or push is produced by schedule create/list/next-occurrence calculation. |

## Software Test Specification (STS)

| Test ID | AC | Level | Setup / action | Expected result |
|---|---|---|---|---|
| TEST-S3-01 | 01 | API/DB | Alice posts Mon/Wed/Fri 08:30 then GETs list. | `201`, then `200`; fields reload exactly; one persisted row. |
| TEST-S3-02a | 02 | API | Alice creates/list own goal. | Owner `201`/`200`. |
| TEST-S3-02b | 02,08 | API | Bob targets Alice goal. | `404 GOAL_NOT_FOUND`, no row/body leak. |
| TEST-S3-03a | 03 | Unit/API | `24:00`, `08:30:01`, empty days, `[1,1]`, `[0]`, `[8]`, `enabled: "yes"`, unknown field. | `400 INVALID_REMINDER_SCHEDULE`; count unchanged. |
| TEST-S3-03b | 03 | API | Valid boundaries `00:00`, `23:59`, days `[1]` and `[1..7]`. | Accepted and normalized ascending. |
| TEST-S3-04 | 04 | API/DB | Create three valid schedules; attempt a fourth. | First three `201`; fourth `409 REMINDER_SCHEDULE_LIMIT_REACHED`; exactly three rows. |
| TEST-S3-05a | 05 | API | Owner posts to goal ending yesterday in Bangkok. | `409 GOAL_ENDED`; no schedule. |
| TEST-S3-05b | 05 | API/DB | Persist schedule, then revision shortens goal before today. | GET remains `200`; same row; `next_occurrence_at: null`. |
| TEST-S3-06a | 06 | Unit | Inject Tue 08:29/08:30/08:31 for Tue 08:30 schedule. | 08:29 gives today; 08:30/08:31 give next selected day; no DB write. |
| TEST-S3-06b | 06 | API/DB | Disabled schedule and candidate after goal end date. | Each returns `next_occurrence_at: null`; stored fields unchanged. |
| TEST-S3-07 | 07 | Unit/API | Sunday 23:59 with Monday 00:00; Monday 00:00 exactly; Saturday schedule crossing to next week. | Correct strictly-future Bangkok UTC timestamp. |
| TEST-S3-08a | 08 | API | No cookie, Manager cookie, Bob cookie for GET and POST. | Respectively `401`, `403`, `404`; generic error only. |
| TEST-S3-09 | 09 | Unit/API | Spy/mock every dispatch adapter while POST/GET/compute run. | No dispatch invocation, queued job, provider request, or delivery record. |

## Definition of Done

- Migration and reversible migration note are reviewed; no existing schedule/goal/record is overwritten.
- Unit/API/UI tests cover AC-S3-01 through AC-S3-09, including Bangkok midnight/week boundaries and revision-end interaction.
- Owner-only check order and no-dispatch proof are executed on local Docker Compose.
- Contract is merged before the first Issue 9 implementation commit.

