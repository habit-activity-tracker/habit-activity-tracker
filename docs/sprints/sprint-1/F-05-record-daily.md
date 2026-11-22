# F-05 — Record daily activity

## Contract status

Sprint 1 contract. This contract implements FR-09, FR-12, FR-13, BR-04, BR-05, BR-06, BR-07, BR-09, and depends on F-01, F-02, F-04, and F-08.

Dependencies: authenticated session/current-user middleware, participant ownership checks, Goal and ActivityTemplate data, the shared date/value validation conventions, and the ActivityRecord migration.

## Behavior and workflow

An authenticated Participant submits a quantity and a calendar date for one of their goals. The API loads the goal with its template, validates ownership and all domain constraints, then inserts one immutable activity record in a transaction. The record is returned after persistence. A duplicate date for the same goal is rejected; no existing row is updated or deleted.

The same calendar date may be recorded for two different goals, including two goals using the same template, because the uniqueness scope is the goal, not the template or participant.

## Domain rules and validation

- The goal must belong to the current Participant. Program Managers and other Participants cannot record against it.
- `activity_date` is a calendar date interpreted in `APP_TIMEZONE`, default `Asia/Bangkok`; timestamps are stored in UTC.
- The date must be today or earlier and within the goal's inclusive `start_date`/`end_date`.
- `quantity` must be numeric, non-negative where the template permits it, and within the template's inclusive `min_value`/`max_value`.
- The database enforces unique `(goal_id, activity_date)` as the final duplicate guard.
- A duplicate returns 409 and leaves the original quantity unchanged.
- Record creation does not recalculate or mutate the goal target. Progress reads the persisted records and applies F-06's total-period calculation.

## API contract

### `POST /api/goals/:id/records`

Request:

```json
{ "activity_date": "2026-11-04", "quantity": 25 }
```

Success: `201`:

```json
{
  "record": {
    "id": "uuid",
    "goal_id": "uuid",
    "activity_date": "2026-11-04",
    "quantity": 25,
    "created_at": "2026-11-04T08:00:00Z"
  }
}
```

Errors use the shared shape `{ "error": { "code": "...", "message": "...", "details": {} } }`:

| Status | Code | Condition |
|---:|---|---|
| 401 | `SESSION_REQUIRED` | No valid session. |
| 403 | `ROLE_FORBIDDEN` | Authenticated Program Manager attempts record creation. |
| 404 | `GOAL_NOT_FOUND` | Goal is not accessible to the current Participant. |
| 400 | `INVALID_ACTIVITY_DATE` | Malformed, future, outside-period, or wrong-timezone date. |
| 400 | `INVALID_QUANTITY` | Non-numeric or out-of-template-range quantity. |
| 409 | `DUPLICATE_DAILY_RECORD` | Record already exists for this goal/date. |

Checks occur in the common order 401 → 403 → 404 → 400 → 409. The API does not expose another user's goal existence.

## Data and transaction design

`ActivityRecord(id, goal_id, activity_date, quantity, created_at)` has a foreign key to Goal and a unique composite index on `(goal_id, activity_date)`. The API validates against the selected goal's template inside the transaction, then inserts. A unique-constraint conflict is translated to `DUPLICATE_DAILY_RECORD`; it cannot overwrite an existing record. Deleting records is not part of this contract.

## UI behavior and migration

The participant record form shows the template unit and valid range, defaults the date to the current `APP_TIMEZONE` calendar date, validates before submission, and displays loading, success, duplicate, validation, forbidden, and retryable-error states. History reloads from the API after success. Migration: create `ActivityRecord`, its Goal foreign key, quantity/date constraints, and unique `(goal_id, activity_date)` index.

## Acceptance criteria

| ID | Observable outcome |
|---|---|
| AC-08 | An owner Participant can create a valid record and retrieve the persisted result. |
| AC-09 | A Program Manager cannot create a record for a participant goal. |
| AC-10 | A Participant cannot create a record for another Participant's goal and receives no private data. |
| AC-11 | A future date is rejected using Asia/Bangkok calendar semantics. |
| AC-12 | A date outside the inclusive goal period is rejected. |
| AC-13 | Quantities at the inclusive template bounds are accepted; values outside them are rejected. |
| AC-14 | A second record for the same goal/date returns 409 and the first quantity remains unchanged. |
| AC-15 | Two goals on one template can each have a record for the same date without collision. |
| AC-16 | Malformed date and quantity inputs return 400 in the shared error shape. |

## STS for F-05

| Test ID | Linked AC | Level | Preconditions/input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-08 | AC-08 | API/database integration | Owner Participant, valid goal/date/quantity. | POST record, then GET records. | 201 and persisted record returned. |
| TEST-09 | AC-09 | API validation/authorization | Program Manager session and participant goal. | POST record. | 403 `ROLE_FORBIDDEN`; no row stored. |
| TEST-10 | AC-10 | API validation/authorization | Participant A session and B's goal. | POST using B's goal ID. | 404 `GOAL_NOT_FOUND`; no B data. |
| TEST-11 | AC-11 | API validation/authorization | Tomorrow generated in `Asia/Bangkok`. | POST future date. | 400 `INVALID_ACTIVITY_DATE`. |
| TEST-12 | AC-12 | API validation/authorization | Goal start/end known. | POST before start and after end. | 400 `INVALID_ACTIVITY_DATE`; no row stored. |
| TEST-13 | AC-13 | API validation/authorization | Inclusive template range `[0, 500]`. | Submit 0, 500, -0.01, 500.01. | Bounds accepted; outside rejected with 400 `INVALID_QUANTITY`. |
| TEST-13a | AC-13 | Unit | Template range `[0, 500]` and decimal validator. | Evaluate 0, 500, -0.01, and 500.01 without HTTP/database dependencies. | Validator accepts inclusive bounds and rejects outside values. |
| TEST-14 | AC-14 | API/database integration | One row exists for goal/date. | POST second quantity. | 409 `DUPLICATE_DAILY_RECORD`; original unchanged. |
| TEST-15 | AC-15 | Database integration | Two goals share one template/date. | POST one record to each. | Both persist independently. |
| TEST-16 | AC-16 | API validation/authorization | Bad date and non-numeric quantity. | POST malformed payloads. | 400 `INVALID_ACTIVITY_DATE` or `INVALID_QUANTITY`; no partial insert. |

## Definition of Done for F-05

The endpoint, ownership checks, timezone/date/value validation, transaction, and unique constraint are implemented. Unit tests cover boundary calculations/validation; API/database tests cover persistence, duplicate rejection, role and cross-owner access; the critical UI journey records and reloads history; a review verifies no overwrite path exists; and test evidence is tied to a reviewed commit.
