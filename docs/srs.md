# Software Requirements Specification

## Part A — Sprint 1 baseline

### 1. Purpose and stakeholder problem

The Habit and Activity Tracking System lets people define a measurable activity goal, record progress, and review history. The chosen Sprint 1 context is **study habits (Theme 8, not Theme 6)**: a participant may set a goal such as reading 120 pages during a date range and record each day's completed pages. The system is a recording and progress-calculation product; it is not a medical diagnosis or treatment product.

### 2. Actors and responsibilities

| Actor | Responsibilities | Sprint 1 access boundary |
|---|---|---|
| Participant | Log in, select a template, create goals, record valid daily activity, view own goals/records/progress. | Can access only their own goals, records, and progress. Cannot edit shared templates. |
| Program Manager | Log in and maintain activity templates (create, list, update allowed metadata). | Does not automatically access participant goals, records, or progress. |
| System | Authenticates users, applies authorization and validation, calculates progress, and persists an audit-friendly record. | Uses calendar dates in `APP_TIMEZONE` (`Asia/Bangkok`). |

### 3. Scope and exclusions

In scope: participant and Program Manager identity/access; study-activity templates; goal creation and listing; one daily record per goal; valid values and dates; total-period progress; private history; template maintenance; reminder/schedule representation as a later placeholder.

Out of scope: medical diagnosis, treatment advice, clinical interpretation, notifications or delivery of reminders, external data sharing, consent-based sharing, goal edit/delete in Sprint 1, template unit changes in Sprint 1, and a manager view of participant private data.

### 4. Functional requirements

| ID | Requirement | Verification | Sprint |
|---|---|---|---|
| FR-01 | The system shall authenticate a registered user and establish a session. | API integration test for valid/invalid login. | S1 |
| FR-02 | The system shall identify the current user and role, and support logout. | API test for `/me` and logout/session invalidation. | S1 |
| FR-03 | A Program Manager shall create a study-activity template with name, description, unit, minimum, and maximum valid values. | Manager API test and schema assertion. | S1 |
| FR-04 | An authenticated user shall list active templates; template unit shall be read-only to users after creation. | API tests for list and PATCH rejection of `unit`. | S1 |
| FR-05 | A Program Manager shall update permitted template fields without changing its unit. | Role and PATCH contract tests. | S1 |
| FR-06 | A Participant shall create a goal for a selected template with target, start date, and end date. | Goal creation acceptance test. | S1 |
| FR-07 | The system shall reject a goal whose total-period target is non-positive or whose dates are invalid. The template range constrains each daily record, not the cumulative goal target. | Boundary and invalid-input tests. | S1 |
| FR-08 | A Participant shall list and retrieve only their own goals. | Cross-participant authorization test. | S1 |
| FR-09 | A Participant shall record a daily activity value for their goal. | Record creation test with valid input. | S1 |
| FR-10 | The system shall enforce one entry per goal per calendar day, rejecting duplicates without overwriting the original. | Duplicate-record test and database constraint test. | S1 |
| FR-11 | The system shall calculate progress as total recorded quantity divided by the goal target times 100, rounded to one decimal place and capped at 100. | Calculation table/unit tests. | S1 |
| FR-12 | The system shall reject records with values outside the template range, future dates, dates outside the goal period, dates more than 7 calendar days before today, or dates not interpreted in `APP_TIMEZONE`. | Validation boundary tests. | S1 / Lab 7 v1.1 |
| FR-13 | Two goals based on the same template shall maintain separate daily records and progress. | Isolation test with two goals. | S1 |
| FR-14 | Participant history, goals, records, and progress shall be private; managers shall not gain access by role alone. | Cross-role and cross-participant access tests. | S1 |
| FR-15 | The UI shall present goals, entry forms, history, and computed progress with shared loading, empty, and error states. | Component and end-to-end UI checks. | S1 |
| FR-16 | A participant shall create and list up to three owner-scoped reminder schedules for an active goal. The system shall compute strict-future next occurrence in `APP_TIMEZONE` and shall not send notifications. | API schedule, access-control, and no-dispatch tests. | S3 |

### 5. Business rules

| ID | Rule | Verification | Sprint |
|---|---|---|---|
| BR-01 | A goal target is the total quantity expected over the whole goal period, not a daily target; template min/max constrain each daily record only. | SRS/API calculation test. | S1 |
| BR-02 | Progress is `total recorded quantity / target * 100`. | Calculation unit test. | S1 |
| BR-03 | Progress is rounded to one decimal place using half-up rounding and capped at 100. | Values ending in 0.05 and over-target tests. | S1 |
| BR-04 | There is at most one record per goal per calendar day. A duplicate is rejected; the existing record is never overwritten. | Unique-constraint and API test. | S1 |
| BR-05 | Separate goals have separate records even when they use the same template. | Isolation test. | S1 |
| BR-06 | A record value must be within the selected template's inclusive valid range. | Min/max boundary tests. | S1 |
| BR-07 | Dates are calendar dates in `APP_TIMEZONE` (`Asia/Bangkok`); future dates and dates more than 7 calendar days before today are rejected. | Time-zone and retrospective-window boundary tests. | S1 / Lab 7 v1.1 |
| BR-08 | A goal may start today or earlier; its end date must be on or after its start date. | Goal date tests. | S1 |
| BR-09 | A record date must fall within the goal's inclusive start/end dates; the retrospective seven-day rule also applies. | Out-of-period and retrospective-window tests. | S1 / Lab 7 v1.1 |
| BR-10 | Direct goal edit/delete remains unavailable; Sprint 2 permits only versioned owner-scoped goal revisions. Template unit is not editable; PATCH rejects `unit`. | Revision, method, and field rejection tests. | S1–S2 |
| BR-11 | Participant data is private. There is no consent-based sharing in the baseline, and Program Managers have no access to participant goals, records, or progress. | Permission matrix and API tests. | S1 |

### 6. Non-functional requirements

| ID | Requirement / measurable target | Verification | Sprint |
|---|---|---|---|
| NFR-01 | For a seeded dataset of 100,000 records, p95 authenticated read/API response time shall be ≤ 500 ms, excluding network transfer. | Performance test. | S2 |
| NFR-02 | All protected endpoints shall reject unauthenticated requests with 401 and unauthorized requests with 403; no private response body shall be returned. | Security integration tests. | S1 |
| NFR-03 | Passwords shall be stored only as bcrypt hashes with cost factor 12 or stronger; plaintext passwords shall not be logged. | Configuration/code review and test. | S1 |
| NFR-04 | The service shall use UTC timestamps for persistence while interpreting user-entered calendar dates in configured `APP_TIMEZONE`. | Time-zone tests and schema review. | S1 |
| NFR-05 | API validation errors shall use one documented JSON error shape and stable machine-readable codes. | Contract tests. | S1 |
| NFR-06 | Automated tests shall cover ≥ 90% of Sprint 1 service/domain rules and all endpoint permission cases. | Local coverage run and test review; CI is Lab 5 work. | S1 |
| NFR-07 | A production deployment shall keep secrets out of source control and use managed secret injection; target recovery point is ≤ 24 h and recovery time objective ≤ 4 h. | Deployment checklist and restore exercise. | S3 |

### 7. Assumptions

1. A user account is provisioned outside this Sprint 1 scope; registration and email verification are not required.
2. `APP_TIMEZONE` defaults to `Asia/Bangkok` and is configurable by deployment, not by participants.
3. Template numeric values and records use a non-negative decimal quantity; the API preserves decimal precision suitable for study units.
4. A template is shared catalog data, but participant goals and records are owner-scoped.
5. The initial database is relational and supports transactions and a unique composite constraint.
6. “Daily” means a calendar date, not a rolling 24-hour period.

### 8. Decisions

| ID | Decision | Rationale / consequence | Status |
|---|---|---|---|
| AD-01 | Choose Theme 8, study habits; do not use Theme 6. | Gives Sprint 1 a concrete, non-medical context. | Approved |
| AD-02 | A goal target is the total quantity for the whole goal period. | Prevents ambiguity between total and daily targets. | Approved |
| AD-03 | Progress formula is total recorded ÷ target × 100. | Matches the stakeholder brief. | Approved |
| AD-04 | Round progress to one decimal using half-up rounding, then cap at 100. | Stable display and no progress above completion. | Approved |
| AD-05 | Enforce one entry per goal per calendar day; reject duplicates and never overwrite. | Preserves auditability. | Approved |
| AD-06 | Records are scoped to goal ID, so two goals on one template remain independent. | Avoids accidental aggregation across goals. | Approved |
| AD-07 | No goal edit or delete in Sprint 1; goal revisions are Sprint 2. | Keeps baseline behavior immutable and reviewable. | Approved |
| AD-08 | Histories are private; no consent-based sharing is implemented. | Privacy is the default; managers do not automatically access records. | Approved |
| AD-09 | Program Managers maintain templates but cannot access participant goals, records, or progress. | Enforces least privilege. | Approved |
| AD-10 | Dates use calendar dates in `APP_TIMEZONE=Asia/Bangkok`; future dates are rejected. | Makes day boundaries deterministic for the chosen deployment. | Approved |
| AD-11 | Goals may start today or earlier and must have an end date not before the start. | Supports retrospective setup without allowing invalid ranges. | Approved |
| AD-12 | Template unit is immutable in Sprint 1; PATCH rejects `unit`. | Existing records must remain interpretable. | Approved |
| AD-13 | Store persistence timestamps in UTC; convert only at the date-validation boundary. | Consistent storage and clear date semantics. | Approved |
| AD-14 | Error check order is 401 → 403 → 404 → 400 → 409. | Prevents information leaks and standardizes clients. | Approved |
| AD-15 | Reminders are represented as placeholders only; no notifications are sent. | Schedule design can evolve without operational side effects. | Approved |
| AD-16 | Use bcrypt-backed password verification and expiring server-side sessions. | Reduces credential and token exposure. | Approved |
| AD-17 | TA Thursday workshop answer for F-11: F-11 is limited to reminder/schedule representation and acceptance criteria; notification delivery, channels, and user opt-in are later-sprint work. | Records the scope decision and keeps S1 feasible. | Approved — Thursday workshop |
| AD-18 | Template min/max values constrain one daily record; a goal target is a separate period-total and is not capped by that range. | A cumulative target must be able to exceed one day's permitted quantity. | Approved |

### 9. Open questions and resolution

| Question | Resolution |
|---|---|
| Which context should be used? | Resolved: study habits, Theme 8, in AD-01. |
| Is target daily or period-total? | Resolved: period-total, in AD-02. |
| How are duplicate days handled? | Resolved: reject, never overwrite, in AD-05. |
| Can goals be changed in Sprint 1? | Resolved: no; Sprint 2 revisions, in AD-07. |
| Can managers view participant progress? | Resolved: no; private by default, in AD-08/AD-09. |
| What does F-11 include? | Resolved by Thursday workshop: placeholder representation only, in AD-17. |
| What timezone defines “today”? | Resolved: configured `APP_TIMEZONE`, default Asia/Bangkok, in AD-10. |
| What notification channels are required? | Deferred with F-11; none are sent in the baseline. |

## Part D — Delivery 2 product update

### Implemented scope and approved change

- **Goal revisions (Sprint 2):** a participant may create an owner-scoped, versioned revision of target/end date. Records remain immutable; revision history is readable with the goal summary.
- **Streak and history summary (Sprint 2):** the owner-only summary exposes total, capped progress, deterministic streak, records, and revisions. Existing older records remain readable; CR-01 limits only new record creation.
- **Reminder schedules (Sprint 3):** an owner may create/list up to three schedules per active goal. A schedule has `HH:MM`, unique ISO weekdays, an enabled flag, and a strict-future `next_occurrence_at` in `APP_TIMEZONE`. No notification, queue, provider, channel, or opt-in behavior is implemented (AD-15/AD-17).
- **CR-01:** new daily records are permitted from today through seven calendar days before today in `APP_TIMEZONE`; older records are rejected. This approved change preserves all goal-period, ownership, and duplicate rules.

### Delivery 2 verification status

| Requirement area | Actual evidence | Result / version |
|---|---|---|
| NFR-01 performance | `docs/evidence/d2-s2/performance-benchmark.md`: 100,002 rows, 1,000 measured authenticated reads, p95 187.46 ms | PASS against <=500 ms, S2-F10-P / `5b6353e` |
| F-11 / FR-16 | `api/tests/api/reminder-schedules.test.ts`; `docs/evidence/d2-s3/issue-106-reminders.md` | PASS, PR #120 merged at `7e8ca5b` |
| CR-01 | `api/tests/api/records.test.ts`; Part A continuity/change register | Implemented and regression-evidenced; preserve final rerun evidence |
| NFR-06 | Issue 5 measured 83 API tests passed and 88.24% service/domain statements | GAP: below 90%; AC-S3-13 remains INCOMPLETE, not PASS |
| NFR-07 | `docs/evidence/d3/issue-5-coverage-readiness.md` | Isolated restore/RTO evidence completed; full RPO remains INCOMPLETE |

## Part E — Delivery 3 final release status

This section supersedes the provisional Delivery 2 verification wording where Delivery 3 supplied later evidence. The release baseline is `d3-staging` merge `0d876ab`; the final row-by-row result and commit mapping are in [traceability.md](traceability.md).

### Released behaviour and approved changes

- **CR-01 remains in force:** new records may be created only for today through seven calendar days ago in `APP_TIMEZONE`; existing older rows remain readable and are not rewritten.
- **Goal lifecycle:** direct `PATCH` and `DELETE /api/goals/:id` remain absent. Participants make owner-scoped, versioned revisions; records remain immutable.
- **Reminder scope:** F-11 is schedule creation/listing (maximum three per active goal) and strict-future occurrence calculation only. No notification provider, channel, queue, opt-in, or dispatch is implemented.
- **Error contract:** malformed JSON is a `400 INVALID_JSON` shared-envelope response; it does not create a session.

### Final measurable NFR comparison

| NFR | Target | Measured/reviewed evidence | Final result |
|---|---|---|---|
| NFR-01 | 100,000 seeded records; authenticated-read p95 ≤500 ms | 100,002 rows; p95 187.46 ms in `performance-benchmark.md` | PASS |
| NFR-02 | Protected routes reject anonymous access (401) and improper role/owner access (403/404) without private data | D3 access matrix passed 74/74 in Docker and Cloud Run | PASS |
| NFR-03 | bcrypt cost ≥12 and no plaintext passwords in logs | bcrypt is tested; deployed-log inspection was not run | INCOMPLETE |
| NFR-04 | UTC persistence and `APP_TIMEZONE` calendar rules | `timestamptz` schema review and Bangkok injected-clock record boundary test | PASS |
| NFR-05 | Stable documented JSON error envelope/codes | validator/API contracts plus malformed-JSON regression | PASS |
| NFR-06 | service/domain statement coverage ≥90% and permission coverage | 83 API tests passed; service/domain statements 88.24% | INCOMPLETE — below target; AC-S3-13 is not PASS |
| NFR-07 | RTO ≤4h and RPO ≤24h | isolated restore reached ready in 57m22s; backup age was 13h10m58s, but incident interval was not measured | INCOMPLETE — RTO passes, complete RPO evidence is absent |

### Final disclosed gaps

AC-34, AC-38, AC-44, and AC-50 have no dedicated component-level automated test and remain INCOMPLETE. GAP-06 is complete as an isolated restore exercise, but it does not convert NFR-07 to PASS because RPO was not fully measured. No statement in this SRS treats coverage below 90% or AC-S3-13 as a pass.

