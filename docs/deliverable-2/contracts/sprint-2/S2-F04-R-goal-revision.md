# S2-F04-R — Goal Revision and Versioned Lifecycle

## Version history

| Version | Date | Author | Reviewer | Change description |
|---|---|---|---|---|
| v1.0 | 24 November 2026 | Chayanit Kuntanarumitkul | Kulchaya Paipinij | Initial contract for Deliverable 2 Sprint 2 feature S2-F04-R. |

## Linked requirements

- **Functional Requirements:** FR-06 (Participant personal goal definition), FR-07 (Goal target definition), FR-08 (Goal tracking and history).
- **Business Rules:** BR-08 (Goal target and period validation), BR-10 (Ownership boundary for participant goals).
- **Non-Functional Requirements:** NFR-02 (Data integrity and auditability), NFR-05 (Authentication and authorization).
- **Architecture & SRS Decisions:** AD-18 (Target is a period total, not capped by template daily min/max), AD-08 (Auditable domain models).

## Feature SDS: behavior and workflow

In Sprint 1 (F-04), goals were immutable after creation. S2-F04-R enables an authenticated Participant to create a **versioned revision** of an existing goal that they own. A revision allows modifying the total-period `target` and/or extending/shortening the `end_date`, while maintaining complete historical integrity:

1. **Explicit Versioning & Audit Trail:**
   - Every revision increments the goal's version counter (`version` = 2, 3, ...) and logs an immutable revision snapshot in `goal_revisions`.
   - The initial goal creation in F-04 is considered version 1.
2. **Absolute Immutability of Past Records:**
   - A revision **never** edits, mutates, or deletes any existing `daily_records` rows.
   - All historical activity records remain intact and associated with the stable `goal_id`.
3. **Start Date Immutability:**
   - The original `start_date` of a goal is strictly immutable and cannot be changed by any revision.
4. **Target Semantics (AD-18):**
   - The `target` represents the cumulative goal for the entire period (`start_date` to `end_date`), not a per-day quantity.
   - The template's `min_value` and `max_value` apply to single daily records (F-05), and must **never** be used to cap or constrain the goal target.
5. **Progress & History Interaction:**
   - Total progress calculation (F-06 / BR-02 / BR-03) reads the current goal's revised `target` and computes percent completion as `(sum(quantity) / current_target) * 100`, rounded half-up to one decimal place and capped at 100.0%.
   - History views (F-07) display all recorded activity against the goal, reflecting the revised target and end date.
6. **Interaction with F-11 (Reminder Scheduling):**
   - **Explicit Architectural Decision:** If a revision shortens `end_date` such that it ends before the current date in `APP_TIMEZONE` (`Asia/Bangkok`), any existing reminder schedules in F-11 remain persisted in the database; however, their dynamic calculation of `next_occurrence_at` evaluates to `null`. The schedule is preserved for audit and is not deleted.

---

## UI / API / data definitions

### Data schema and persistence

#### 1. Schema migration: `goal_revisions` table
```sql
CREATE TABLE IF NOT EXISTS goal_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    target NUMERIC(10, 2) NOT NULL CHECK (target > 0),
    end_date DATE NOT NULL,
    effective_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_goal_version UNIQUE (goal_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_goal_revisions_goal_id ON goal_revisions(goal_id);
```

#### 2. Goals table update
```sql
ALTER TABLE goals ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
```

#### 3. Unaffected data layers
- `activity_templates`: **no change**.
- `daily_records`: **no change**. Records remain immutable with composite key `(goal_id, activity_date)`.
- `users`: **no change**.

---

### API contract

#### `POST /api/goals/:id/revisions`

Creates a new versioned revision for an owned goal.

**Headers:**
- `Cookie`: valid session cookie (authenticated participant).
- `Content-Type`: `application/json`.

**Request Body:**
```json
{
  "target": 500,
  "end_date": "2026-12-15"
}
```

**Success Response: `201 Created`**
```json
{
  "goal": {
    "id": "e2d5b602-0e4f-4d37-88e2-04e8d2e8b2b9",
    "participant_id": "8c4d2938-16e7-44fa-a83a-86c4f1c841bb",
    "template_id": "41bc0da1-d035-43a9-a9a7-9577cba7a950",
    "target": 500,
    "start_date": "2026-11-01",
    "end_date": "2026-12-15",
    "version": 2,
    "created_at": "2026-11-01T08:00:00.000Z",
    "updated_at": "2026-11-24T14:30:00.000Z"
  },
  "revision": {
    "id": "7bf317c8-9d41-48e0-bb15-0d32bb590db2",
    "goal_id": "e2d5b602-0e4f-4d37-88e2-04e8d2e8b2b9",
    "version_number": 2,
    "target": 500,
    "end_date": "2026-12-15",
    "effective_date": "2026-11-24",
    "created_at": "2026-11-24T14:30:00.000Z"
  }
}
```

#### `GET /api/goals/:id/revisions`

Retrieves all revisions for an owned goal in ascending version order.

**Success Response: `200 OK`**
```json
{
  "revisions": [
    {
      "id": "...",
      "goal_id": "e2d5b602-0e4f-4d37-88e2-04e8d2e8b2b9",
      "version_number": 1,
      "target": 300,
      "end_date": "2026-11-30",
      "effective_date": "2026-11-01",
      "created_at": "2026-11-01T08:00:00.000Z"
    },
    {
      "id": "7bf317c8-9d41-48e0-bb15-0d32bb590db2",
      "goal_id": "e2d5b602-0e4f-4d37-88e2-04e8d2e8b2b9",
      "version_number": 2,
      "target": 500,
      "end_date": "2026-12-15",
      "effective_date": "2026-11-24",
      "created_at": "2026-11-24T14:30:00.000Z"
    }
  ]
}
```

#### Unaffected endpoints
- `POST /api/goals`: **no change** (creates version 1).
- `GET /api/goals`: **no change** (returns active target, end_date, and version).
- `GET /api/goals/:id`: **no change** (returns active goal details).
- `POST /api/goals/:id/records`: **no change** (daily records endpoint remains identical).

---

## Validation, errors, boundaries, permissions

### Enforcement check order
The endpoint evaluates checks in strict precedence:
1. **`401 SESSION_REQUIRED`**: Caller is unauthenticated or session cookie is invalid/expired.
2. **`403 ROLE_FORBIDDEN`**: Authenticated user is not in the `participant` role (e.g. Program Manager).
3. **`404 GOAL_NOT_FOUND`**: Goal does not exist or belongs to another participant (privacy protection per BR-10).
4. **`400 INVALID_GOAL_ID`**: `:id` parameter is not a valid UUID format.
5. **`400 INVALID_GOAL`**: Validation of payload fails:
   - `target` is non-numeric, zero, negative, or exceeds numeric bounds (`10, 2`).
   - `end_date` is not in `YYYY-MM-DD` format or is prior to the goal's immutable `start_date`.
   - Unknown/extraneous payload properties are rejected.

### Error response table

| Status | Error code | Condition | Details shape |
|---:|---|---|---|
| 401 | `SESSION_REQUIRED` | Missing or expired session cookie. | `{}` |
| 403 | `ROLE_FORBIDDEN` | Caller is a Program Manager. | `{}` |
| 404 | `GOAL_NOT_FOUND` | Goal ID not found or owned by another user. | `{}` |
| 400 | `INVALID_GOAL_ID` | Malformed UUID in route parameter. | `{ "id": "Must be a valid UUID." }` |
| 400 | `INVALID_GOAL` | Target $\le 0$ or non-numeric. | `{ "target": "Target must be greater than zero." }` |
| 400 | `INVALID_GOAL` | End date precedes `start_date`. | `{ "end_date": "End date cannot be earlier than start date." }` |

---

## UI behavior

- The Goal view provides a "Revise goal" action available only to the goal owner.
- The revision modal/form presents current target and end date, allowing input of a new target and/or new end date.
- Shows live validation, loading indicator while saving, and displays updated target and progress immediately upon success.
- Revision history drawer/section lists previous versions with their effective dates.

---

## Acceptance criteria

| ID | Description |
|---|---|
| **AC-S2-01** | An authenticated owner Participant can create a versioned revision of an existing goal with a revised target and/or end date; the goal version increments and a `goal_revisions` record is persisted. |
| **AC-S2-02** | Goal target is validated as a positive decimal total for the period (per AD-18); values $\le 0$ or non-numeric return `400 INVALID_GOAL` without mutating the goal. The template daily min/max range does not constrain the target. |
| **AC-S2-03** | The goal's original `start_date` is immutable and cannot be altered by a revision. The revised `end_date` cannot precede `start_date`; invalid date returns `400 INVALID_GOAL`. |
| **AC-S2-04** | All existing `daily_records` for the goal remain strictly immutable; no past record is updated, truncated, or deleted when a goal is revised or shortened. |
| **AC-S2-05** | Access control is enforced: an unauthenticated request returns `401 SESSION_REQUIRED`; a Program Manager returns `403 ROLE_FORBIDDEN`; another Participant attempting to revise or view revisions receives `404 GOAL_NOT_FOUND`. |
| **AC-S2-06** | F-11 interaction: If a goal revision shortens `end_date` to earlier than today in `APP_TIMEZONE`, any existing reminder schedules stay persisted in the database, and their dynamically calculated `next_occurrence_at` evaluates to `null`. |

---

## Software Test Specification (STS)

| Test ID | Linked AC | Level | Preconditions / Input | Action | Expected Outcome |
|---|---|---|---|---|---|
| **TEST-S2-01** | AC-S2-01 | API / DB Integration | Alice owns Goal v1 (`target=100`, `end_date=2026-11-30`). | POST `/api/goals/:id/revisions` with `{ target: 200, end_date: "2026-12-15" }`. | `201 Created`; Goal updated to `version=2`, `target=200`; `goal_revisions` has row for version 2. |
| **TEST-S2-02a** | AC-S2-02 | Unit | Validator with `target=0`, `-50`, `"invalid"`. | Call revision validator. | Invalid; details contain target error. |
| **TEST-S2-02b** | AC-S2-02 | API Integration | Template max daily is 100; submit revision with `target=5000`. | POST `/api/goals/:id/revisions`. | `201 Created`; target is accepted (AD-18 confirmed). |
| **TEST-S2-03** | AC-S2-03 | API Integration | Goal `start_date = 2026-11-01`; submit `end_date = 2026-10-31`. | POST `/api/goals/:id/revisions`. | `400 INVALID_GOAL`; goal unchanged. |
| **TEST-S2-04** | AC-S2-04 | API / DB Integration | Goal has 3 daily records; submit valid revision shortening `end_date`. | POST revision, then query `daily_records`. | `201 Created`; all 3 records remain unchanged with original quantities and dates. |
| **TEST-S2-05a** | AC-S2-05 | API Authorization | PM logs in; attempts to revise Alice's goal. | POST `/api/goals/:id/revisions`. | `403 ROLE_FORBIDDEN`; no row added. |
| **TEST-S2-05b** | AC-S2-05 | API Authorization | Bob logs in; attempts to revise Alice's goal. | POST `/api/goals/:id/revisions`. | `404 GOAL_NOT_FOUND`; Alice's goal untouched. |
| **TEST-S2-05c** | AC-S2-05 | API Authorization | No session cookie provided. | POST `/api/goals/:id/revisions`. | `401 SESSION_REQUIRED`. |
| **TEST-S2-06** | AC-S2-06 | API / DB Integration | Goal has reminder schedule; revise goal with `end_date < today`. | POST revision, then GET schedules. | Schedule row exists; `next_occurrence_at` is `null`. |

---

## Definition of Done

1. Database migration creates `goal_revisions` table and adds `version` column to `goals`.
2. Unit tests verify revision schema validation, date boundary checks, and AD-18 period target handling.
3. API tests verify 401/403/404 permission checks, successful revision persistence, and unchanged `daily_records`.
4. Interaction with F-11 verified (null `next_occurrence_at` on ended goals).
5. All tests pass on local Docker Compose environment.
