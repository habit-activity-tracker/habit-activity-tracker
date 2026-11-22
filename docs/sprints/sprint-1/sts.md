# Sprint 1 Software Test Specification

## Scope and test evidence

This STS is the shared AC-to-test index for the Sprint 1 contracts: F-01, F-02, F-03 (create, browse, and edit), F-04, F-05, F-06, and F-07. Detailed test rows remain in their owning feature contract. F-11 remains the S1-01 reminder/schedule placeholder. Tests were planned at unit, API/integration, database, and selected UI/end-to-end levels. Each test records its precondition, action, and observable result. The actual execution results, test file references, counts, and tested commit are recorded below.

## S1-10 actual execution results

The commands below were run from `sprint-1-staging` at tested commit **`7620242`** (`F-11: Implement Activity Template Editing for Managers (#27)`). Raw full outputs are committed under `docs/evidence/`. The evidence files were added after the test run; the docs-only commit does not change the tested code.

| Command | Result | Counts | Evidence |
|---|---|---|---|
| `npm run build` | PASS | API and web builds completed | `docs/evidence/sprint1-build-7620242.log` |
| `npm run test:unit` | PASS | 4 suites, 8 tests passed; 0 failed, 0 skipped | `docs/evidence/sprint1-test-unit-7620242.log` |
| `npm run test:api` | PASS | 8 suites, 44 tests passed; 0 failed, 0 skipped | `docs/evidence/sprint1-test-api-7620242.log` |
| `npm run test:e2e` | PASS | 3 tests passed; 0 failed, 0 skipped | `docs/evidence/sprint1-test-e2e-7620242.log` |

The E2E set covers the shell, authentication/logout, and the persisted manager-to-participant journey including duplicate daily-entry rejection. No required test was weakened or skipped. The API/database suite used the real local PostgreSQL test database.

The current working baseline adds a rounding regression and a cumulative-target regression. Its expected inventory is 9 unit tests, 45 API/database tests, and 3 E2E tests; it must be re-run and recorded at the commit that contains those changes rather than overwriting the historical `7620242` result.

## S1-03 to S1-09 integration confirmation

The following feature PRs are present in `sprint-1-staging` before this S1-10 docs branch:

| Sprint | Feature | Branch | PR | Staging evidence |
|---|---|---|---:|---|
| S1-03 | Project skeleton and test harness | `feature/setup-skeleton` | #11 | merged before S1-04 |
| S1-04 | F-01 authentication | `feature/F-01-auth` | #13 | merged before S1-05 |
| S1-05 | F-02/F-03 templates | `feature/F-02-F-03-templates` | #15 | merged before S1-06 |
| S1-06 | F-04 create personal goal | `feature/F-04-create-goal` | #18 | merged before S1-07 |
| S1-07 | F-05 record daily activity | `feature/F-05-record-daily` | #20 | merged before S1-08 |
| S1-08 | F-06/F-07 progress and history | `feature/F-06-progress-history` | #22 | merged before S1-09 |
| S1-09 | F-03 template editing (task label F-11) | `feature/F-11-edit-template` | #27 | staging commit `7620242` |

S1-09 is documented under canonical feature ID F-03; S1-01's F-11/FR-16 reminder placeholder remains Sprint 3.

## Baseline alignment

S1-01 is the source of truth for shared IDs and sprint allocation. Therefore `F-11` and `FR-16` remain planned for Sprint 3 as recorded in the merged baseline. The S1-02 task wording that places FR-16 in Sprint 1 is not adopted because no approved change has amended S1-01. This Part A contract does not implement or renumber F-11.

## Test cases

| ID | AC | Level | Preconditions / input | Action | Expected result |
|---|---|---|---|---|---|
| TEST-01 | AC-01 | API/database integration | Seeded Participant credentials are valid. | POST login with correct credentials. | 200, secure session cookie, correct safe user/role. |
| TEST-02 | AC-02 | API/database integration | Unknown email or wrong password. | POST login. | 401 `INVALID_CREDENTIALS`; no account-existence detail. |
| TEST-02a | AC-02a | API validation/authorization | Missing email, missing password, or malformed email. | POST login with malformed body. | 400 `INVALID_LOGIN_REQUEST`; no authentication attempt is disclosed. |
| TEST-03 | AC-03 | API/database integration | Participant A session active. | GET `/api/me`. | 200 with A's safe identity only. |
| TEST-04 | AC-04 | API validation/authorization | No cookie, revoked session, and expired session cases. | Call `/api/me` and a protected endpoint. | 401; no private response body. |
| TEST-05 | AC-05 | API/database integration | Active session exists. | POST logout, then reuse cookie. | First response 204; subsequent protected call 401. |
| TEST-06 | AC-06 | API/database integration | Seeded user credentials. | Inspect stored password hash after seed/login setup. | bcrypt hash only. Log inspection is not automated. |
| TEST-07 | AC-07 | API/database integration | Successful login over configured environment. | Inspect `Set-Cookie`. | `HttpOnly` and `SameSite=Lax`. `Secure` and expiry are not asserted by the current test. |
| TEST-08 | AC-08 | API/database integration | Participant owns a valid goal; date is in period; quantity is in range. | POST one record, then GET records. | 201 and the same persisted record is returned. |
| TEST-09 | AC-09 | API validation/authorization | Program Manager session and participant goal. | POST record for that goal. | 403 `ROLE_FORBIDDEN`; no record stored. |
| TEST-10 | AC-10 | API validation/authorization | Participant A session; Participant B goal. | POST record using B's goal ID. | 404 `GOAL_NOT_FOUND`; no record or B data exposed. |
| TEST-11 | AC-11 | API validation/authorization | Goal is active; tomorrow is generated in `Asia/Bangkok`. | POST record with future date. | 400 `INVALID_ACTIVITY_DATE`. |
| TEST-12 | AC-12 | API validation/authorization | Goal has inclusive start/end dates. | POST before start and after end. | Each request returns 400 `INVALID_ACTIVITY_DATE`; no row stored. |
| TEST-13 | AC-13 | API validation/authorization | Template range is inclusive `[0, 500]`. | Submit 0, 500, -0.01, and 500.01. | Boundary values accepted; outside values rejected with 400 `INVALID_QUANTITY`. |
| TEST-13a | AC-13 | Unit | Template range `[0, 500]` and decimal validator. | Evaluate 0, 500, -0.01, and 500.01 without HTTP/database dependencies. | Validator accepts inclusive bounds and rejects outside values. |
| TEST-14 | AC-14 | API/database integration | One record already exists for goal/date. | POST a second quantity for same goal/date. | 409 `DUPLICATE_DAILY_RECORD`; first quantity unchanged. |
| TEST-15 | AC-15 | Database integration | Two goals use the same template and date. | POST one record to each goal. | Both inserts succeed and remain independently queryable. |
| TEST-16 | AC-16 | API validation/authorization | Bad date syntax and non-numeric quantity. | POST malformed payloads. | 400 `INVALID_ACTIVITY_DATE` or `INVALID_QUANTITY`; no partial insert. |
| TEST-17 | AC-17 | API/database integration | Manager session and active template. | PATCH allowed metadata. | 200; reload shows persisted update. |
| TEST-18 | AC-18 | API validation/authorization | Participant session and shared template. | PATCH template metadata. | 403 `ROLE_FORBIDDEN`; template unchanged. |
| TEST-19 | AC-19 | API/database integration | Existing template has unit `pages`. | PATCH with `unit: "hours"` or same unit. | 400 `UNIT_IMMUTABLE`; stored unit remains `pages`. |
| TEST-20 | AC-20 | API/database integration | Manager session and active template. | Submit empty name, min > max, unknown field, and malformed decimal. | 400 for each; no partial update. |
| TEST-21 | AC-21 | Database integration | Goal and record reference template. | Apply allowed template metadata update and reload goal/record. | Foreign keys and historical unit meaning remain intact. |
| TEST-22 | AC-22 | API validation/authorization | Manager requests absent/inaccessible template ID. | PATCH unknown ID. | 404 `TEMPLATE_NOT_FOUND`; no private resource detail. |
| TEST-24 | AC-01, AC-08, AC-14 | UI/E2E | Seeded accounts, template, and empty goal state. | Login, create/select goal, record valid date, repeat same date, reload history. | Normal journey persists; duplicate error is visible; original record remains. |
| TEST-25 | AC-18, AC-19 | UI/E2E | Participant session and template page. | Attempt template edit and unit change through UI/API. | Backend rejects both; UI shows permission/validation error. |

## Required execution matrix

| Area | Minimum evidence |
|---|---|
| Unit/domain | Progress/date/value and session-policy tests with pass count. |
| API/database | Login/session, record persistence/duplicate, ownership, template update/unit immutability, and conflict tests against a real test database. |
| UI/E2E | One normal login-to-record-and-reload journey plus a visible rejection. |
| Security | Unauthenticated, wrong-role, cross-participant, and participant-template-edit cases. |

## AC-to-test map

| Feature | Acceptance criteria | Planned tests |
|---|---|---|
| F-01 | AC-01–AC-07, AC-02a | TEST-01–TEST-07, TEST-02a |
| F-02 | AC-23–AC-27 | TEST-26–TEST-30 |
| F-03 create/browse | AC-31–AC-38 | TEST-31–TEST-38 |
| F-03 edit | AC-17–AC-22 | TEST-17–TEST-22 |
| F-04 | AC-39–AC-44 | TEST-39–TEST-44, TEST-42a |
| F-05 | AC-08–AC-16 | TEST-08–TEST-16, TEST-13a |
| F-06 progress calculation | AC-45–AC-47 | TEST-45–TEST-47 |
| F-07 history/progress views | AC-48–AC-50 | TEST-48–TEST-50 |
| F-11 | Sprint 3 reminder/schedule placeholder | Not a Sprint 1 implementation contract. |

## Canonical-ID to implementation-name mapping

The contracts and STS retain canonical `AC-01..50` / `TEST-01..50` identifiers. Source tests use feature-local names; this table prevents treating those names as a second contract ID set.

| Canonical ID | Source test label / location |
|---|---|
| TEST-01..TEST-07 | `TEST-01.1`..`TEST-01.7` in `api/tests/api/auth.test.ts` |
| TEST-08, TEST-13, TEST-14, TEST-16 | `TEST-05.1`, `.2`, `.4`, `.3/.7` in `api/tests/api/records.test.ts` |
| TEST-09, TEST-10, TEST-15 | `TEST-05.8`, `.5`, and the same-template two-goal case in `api/tests/api/records.test.ts` |
| TEST-13a | unlabeled inclusive-bounds unit case in `api/tests/unit/record.validator.test.ts` |
| TEST-29 / AC-26 | `TEST-04.6 / AC-04.6` in `api/tests/api/goals.test.ts` |
| TEST-39..TEST-42 | `TEST-04.1`, `.5`, `.7`, `.2` in `api/tests/api/goals.test.ts` |
| TEST-17..TEST-22 | canonical labels (also prefixed `S1-09 TEST-11.x`) in `api/tests/api/templates.update.test.ts` |
| TEST-31..TEST-38 | feature-local `TEST-03.x` labels in template create/list tests |
| TEST-45..TEST-47 | unlabeled unit/API progress cases in `api/tests/unit/progress.test.ts` and `api/tests/api/progress.test.ts` |

## Manual checks

| ID | Preconditions / action | Expected result |
|---|---|---|
| M-01 | Inspect repository, `.gitignore`, environment examples, logs, and test output for passwords, tokens, session secrets, or production credentials. | No real secrets are committed, displayed, or logged. |
| M-02 | Start from a clean checkout, follow the documented setup/migration/seed commands, and run the documented build/test commands. | Setup is reproducible; migration and seed complete; build/tests run without undocumented local state. |

### S1-10 actual manual results

| ID | Result | Evidence/notes |
|---|---|---|
| M-01 | PASS | Reviewed tracked files, `.gitignore`, `.env.example`, generated logs, and test output. No real secrets, passwords, session tokens, or production credentials were committed or logged. Seed credentials are referenced only through local `SEED_DEMO_PASSWORD`. |
| M-02 | PASS | On staging commit `7620242`, PostgreSQL was started, migrations and seed completed, and the documented build/unit/API/database/E2E commands completed with the counts recorded above. |

## Critical journey coverage

The selected end-to-end journey is TEST-24: login as a Participant, select/create a study goal, record a valid daily activity, attempt the same date again, observe the 409 rejection, reload history, and verify the original persisted record. TEST-01/05 cover authentication lifecycle, TEST-08/14 cover persistence and duplicate rejection, and TEST-25 covers backend role restriction.

## Definition of Done for this STS

Every planned AC has an executed test or an explicitly recorded exception. Test names/files, commands, results, and tested commit are recorded. Domain tests include negative and boundary cases; API/database tests use real persistence and backend authorization; the selected UI journey is exercised; failures/skips are disclosed; teammate review and integration are complete; and the contract filename matches the canonical feature ID.
