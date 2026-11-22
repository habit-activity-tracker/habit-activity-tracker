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
| FR-12 | The system shall reject records with values outside the template range, future dates, dates outside the goal period, or dates not interpreted in `APP_TIMEZONE`. | Validation boundary tests. | S1 |
| FR-13 | Two goals based on the same template shall maintain separate daily records and progress. | Isolation test with two goals. | S1 |
| FR-14 | Participant history, goals, records, and progress shall be private; managers shall not gain access by role alone. | Cross-role and cross-participant access tests. | S1 |
| FR-15 | The UI shall present goals, entry forms, history, and computed progress with shared loading, empty, and error states. | Component and end-to-end UI checks. | S1 |
| FR-16 | The system shall expose reminder/schedule representation as a future placeholder without sending notifications. | SDS contract review and no-dispatch test. | S3 |

### 5. Business rules

| ID | Rule | Verification | Sprint |
|---|---|---|---|
| BR-01 | A goal target is the total quantity expected over the whole goal period, not a daily target; template min/max constrain each daily record only. | SRS/API calculation test. | S1 |
| BR-02 | Progress is `total recorded quantity / target * 100`. | Calculation unit test. | S1 |
| BR-03 | Progress is rounded to one decimal place using half-up rounding and capped at 100. | Values ending in 0.05 and over-target tests. | S1 |
| BR-04 | There is at most one record per goal per calendar day. A duplicate is rejected; the existing record is never overwritten. | Unique-constraint and API test. | S1 |
| BR-05 | Separate goals have separate records even when they use the same template. | Isolation test. | S1 |
| BR-06 | A record value must be within the selected template's inclusive valid range. | Min/max boundary tests. | S1 |
| BR-07 | Dates are calendar dates in `APP_TIMEZONE` (`Asia/Bangkok`); future dates are rejected. | Time-zone boundary test. | S1 |
| BR-08 | A goal may start today or earlier; its end date must be on or after its start date. | Goal date tests. | S1 |
| BR-09 | A record date must fall within the goal's inclusive start/end dates. | Out-of-period tests. | S1 |
| BR-10 | Sprint 1 permits no goal edit or delete; goal revisions are Sprint 2. Template unit is not editable; PATCH rejects `unit`. | Method/field rejection tests. | S1 |
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

