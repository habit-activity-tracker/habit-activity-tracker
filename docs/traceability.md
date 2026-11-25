# Requirements traceability — Sprint 1 baseline

| Requirement | Feature | Sprint | Acceptance criterion / test |
|---|---|---|---|
| FR-01 | F-01 | S1 | AC-01/AC-02/AC-02a; TEST-01/TEST-02/TEST-02a login validation. |
| FR-02 | F-01 | S1 | AC-03–AC-05; TEST-03–TEST-05 current user and logout. |
| FR-03 | F-03 | S1 | AC-31–AC-34; TEST-31–TEST-34 template creation. |
| FR-04 | F-03 | S1 | AC-35, AC-35a, AC-36–AC-38; TEST-35, TEST-35a, TEST-36–TEST-38 template browsing. |
| FR-05 | F-03 | S1 | AC-17–AC-22; TEST-17–TEST-22 template editing. |
| FR-06 | F-04 | S1 | AC-39/AC-44; TEST-39/TEST-44 goal creation journey. |
| FR-07 | F-04 | S1 | AC-42; TEST-42/TEST-42a target/date validation. |
| FR-08 | F-02/F-04/F-07 | S1 | AC-26/AC-39/AC-48/AC-49; TEST-29/TEST-39/TEST-48/TEST-49 ownership and retrieval. |
| FR-09 | F-05 | S1 | AC-08; TEST-08 daily record creation. |
| FR-10 | F-05 | S1 | AC-14; TEST-14 duplicate rejection without overwrite. |
| FR-11 | F-06 | S1 | AC-45–AC-47; TEST-45–TEST-47 progress calculation. |
| FR-12 | F-05 | S1 | AC-11–AC-13/AC-16; TEST-11–TEST-13/TEST-16 record validation. |
| FR-13 | F-05/F-07 | S1 | AC-15/AC-47; TEST-15/TEST-47 separate goals remain independent. |
| FR-14 | F-02/F-07 | S1 | AC-25–AC-27/AC-49; TEST-28–TEST-30/TEST-49 privacy and authorization. |
| FR-15 | F-07 | S1 | AC-44/AC-50; TEST-44/TEST-50 UI state and history/progress views. |
| FR-16 | F-11 | S3 | Future F-11 contract; no Sprint 1 implementation or test. |
| BR-01 | F-06 | S1 | AC-45; TEST-45 total-period target. |
| BR-02 | F-06 | S1 | AC-45; TEST-45 progress formula. |
| BR-03 | F-06 | S1 | AC-45; TEST-45 half-up rounding and cap. |
| BR-04 | F-05 | S1 | AC-14; TEST-14 unique `(goal_id, activity_date)`. |
| BR-05 | F-05/F-07 | S1 | AC-15/AC-47; TEST-15/TEST-47 same-template goal isolation. |
| BR-06 | F-05 | S1 | AC-13; TEST-13 inclusive range. |
| BR-07 | F-05 | S1 | AC-11; TEST-11 Asia/Bangkok date boundary. |
| BR-08 | F-04 | S1 | AC-42; TEST-42/TEST-42a goal date rules. |
| BR-09 | F-05 | S1 | AC-12; TEST-12 goal-period boundary. |
| BR-10 | F-03/F-04 | S1 | AC-19/AC-43; TEST-19/TEST-43 immutable unit and goal lifecycle. |
| BR-11 | F-02 | S1 | AC-23–AC-27; TEST-26–TEST-30 privacy/role enforcement. F-11 sharing remains out of scope in S3. |
| NFR-01 | F-10 | S2 | N-01 planned performance verification. |
| NFR-02 | F-01/F-02/F-04 | S1 | AC-04/AC-23/AC-40; TEST-04/TEST-26/TEST-40 protected access. |
| NFR-03 | F-01 | S1 | AC-06; TEST-06 bcrypt and log inspection. |
| NFR-04 | F-05/F-08 | S1 | AC-11; TEST-11 UTC persistence/timezone behavior. |
| NFR-05 | F-03/F-04/F-05 | S1 | Contract error-shape tables and TEST-16/TEST-20/TEST-32/TEST-42. |
| NFR-06 | F-10 | S1 | Local coverage command/report plus service/domain and endpoint-permission test review. M-01/M-02 cover secrets and clean setup, not coverage. |
| NFR-07 | F-10 | S3 | N-07 planned secret/deployment/recovery verification. |

## Coverage gaps and approved changes

Coverage gaps: AC-02a and AC-43 have no automated test. AC-06 covers bcrypt storage but not log inspection; AC-07 covers `HttpOnly` and `SameSite=Lax` but not `Secure` or expiry. AC-34, AC-38, AC-44, and AC-50 have no automated component test and rely on build/selected E2E evidence. F-11 and NFR-01 are implemented in Delivery 2; NFR-07 remains planned. Approved changes: AD-01 through AD-18 in `srs.md`, including CR-01.

## Delivery 2 execution matrix

Result is recorded only where the cited command, test, or measurement was executed. `planned` and `GAP` are not pass claims.

| Requirement | Feature / responsibility | Sprint | AC / NFR check | Planned test | Actual file / test or measurement | Result | Version |
|---|---|---|---|---|---|---|---|
| FR-01 | F-01 auth | S1 | AC-01–02a | valid/invalid login | `auth.test.ts`, Part A rerun (11 passed) | PASS | `c5d3122` |
| FR-02 | F-01 session | S1 | AC-03–05 | me/logout | `auth.test.ts`, Part A rerun | PASS | `c5d3122` |
| FR-03 | F-03 templates | S1 | AC-31–34 | create template | `templates.create.test.ts` | PASS (Part A rerun) | `c5d3122` |
| FR-04 | F-03 templates | S1 | AC-35–38 | list templates | `templates.list.test.ts` | PASS (Part A rerun) | `c5d3122` |
| FR-05 | F-03 templates | S1 | AC-17–22 | update template | `templates.update.test.ts` | PASS (Part A rerun) | `c5d3122` |
| FR-06 | F-04 lifecycle | S1–S2 | AC-39/44, S2-01–06 | create/revise goal | `goals.test.ts`; `goals.revision.test.ts` (8 passed) | PASS | `7f04dbd` |
| FR-07 | F-04 lifecycle | S1–S2 | AC-42 | goal validation | `goal.validator.test.ts`; `goals.test.ts` | PASS (Part A rerun) | `c5d3122` |
| FR-08 | F-02/F-04/F-07 | S1–S2 | ownership | owner retrieval | `access-control.sprint2.test.ts` | PASS (4 passed) | D2 S2 |
| FR-09 | F-05 records | S1 | AC-08 | create record | `records.test.ts` | PASS (19 passed) | `c5d3122` |
| FR-10 | F-05 records | S1 | AC-14 | duplicate reject | `records.test.ts` | PASS | `c5d3122` |
| FR-11 | F-06/F-07 | S1–S2 | progress/streak | progress summary | `progress.test.ts`; `sprint2.history.test.ts` | PASS (Issue 6) | `6da30d5` |
| FR-12 | F-05 records | S1/CR-01 | AC-11–13/16 | date/value boundaries | `records.test.ts` | PASS (19 passed) | `c5d3122` |
| FR-13 | F-05/F-07 | S1 | AC-15/47 | goal isolation | `records.test.ts` | PASS | `c5d3122` |
| FR-14 | F-02/F-07 | S1–S3 | privacy | 401/403/404 | `access-control.sprint2.test.ts`; reminder suite | PASS | `7e8ca5b` |
| FR-15 | F-07 UI | S1–S2 | UI states | E2E journey | Part A E2E evidence (3 passed) | PASS | `1619417` |
| FR-16 | F-11 schedules | S3 | AC-S3-01–09 | create/list/no dispatch | `reminder-schedules.test.ts` (6 passed) | PASS | `7e8ca5b` |
| BR-01 | F-06 progress | S1 | AC-45 | period-total target | `progress.test.ts` | PASS (Part A rerun) | `c5d3122` |
| BR-02 | F-06 progress | S1 | AC-45 | progress formula | `progress.test.ts` | PASS (Part A rerun) | `c5d3122` |
| BR-03 | F-06 progress | S1 | AC-45 | half-up rounding/cap | `progress.test.ts` | PASS (Part A rerun) | `c5d3122` |
| BR-04 | F-05 records | S1 | AC-14 | unique goal/date record | `records.test.ts` | PASS (19 passed) | `c5d3122` |
| BR-05 | F-05/F-07 | S1 | AC-15/47 | goal isolation | `records.test.ts` | PASS | `c5d3122` |
| BR-06 | F-05 records | S1 | AC-13 | inclusive value range | `records.test.ts` | PASS | `c5d3122` |
| BR-07 | F-05/F-08 | S1/CR-01 | AC-11 | APP_TIMEZONE/future/7-day cutoff | `records.test.ts` | PASS (19 passed) | `c5d3122` |
| BR-08 | F-04 lifecycle | S1 | AC-42 | goal dates | `goals.test.ts` | PASS (Part A rerun) | `c5d3122` |
| BR-09 | F-05 records | S1/CR-01 | AC-12 | goal-period date boundary | `records.test.ts` | PASS | `c5d3122` |
| BR-10 | F-03/F-04 | S1–S2 | immutability | unit/revision rules | `templates.update.test.ts`; `goals.revision.test.ts` | PASS | `7f04dbd` |
| BR-11 | F-02/F-11 | S1–S3 | privacy/no dispatch | role + scope tests | `access-control.sprint2.test.ts`; `reminder-schedules.test.ts`; Issue 106 evidence | PASS | `7e8ca5b` |
| NFR-01 | F-10 performance | S2 | p95 <=500 ms | 100k benchmark | `docs/evidence/d2-s2/performance-benchmark.md` | PASS: 187.46 ms | `5b6353e` |
| NFR-02 | F-01/F-02 | S1–S3 | protected access | 401/403 checks | `access-control.sprint2.test.ts`; `reminder-schedules.test.ts` | PASS | `7e8ca5b` |
| NFR-03 | F-01 auth | S1 | bcrypt/no logs | auth/code review | `auth.test.ts`; log inspection planned | planned | baseline |
| NFR-04 | F-05/F-08 | S1 | UTC/timezone | timezone boundaries | `records.test.ts` | PASS (Part A rerun) | `c5d3122` |
| NFR-05 | F-08/F-11 | S1–S3 | stable error codes | validation contracts | `goal.validator.test.ts`; `record.validator.test.ts`; `template.validator.test.ts`; `reminder-schedules.test.ts` | PASS (reminder scope; baseline evidence retained) | `7e8ca5b` |
| NFR-06 | F-10 coverage | S3 | >=90% | coverage re-measure | Lab 7: 83.05% | GAP; planned | NFR-06-GAP |
| NFR-07 | F-10 ops | S3 | secret/RPO/RTO | restore exercise | S3-F10-O contract | planned | S3-F10-O |

| CR-01 | F-05 approved change | Lab 7 / D2 | seven-day new-record window | today through 7 days ago; reject day 8 | `records.test.ts`; `part-a-continuity-and-change-register.md` | PASS (19 passed on recorded rerun) | `c5d3122` |

### Per-AC delivery status

| Delivery / AC range | Implemented? | Verification run? | Passed? | Actual evidence |
|---|---:|---:|---:|---|
| S2-F04-R, AC-S2-01–06 | Yes | Yes | Yes | `goals.revision.test.ts`: 8 passed; `docs/evidence/d2-s2/issue-102-tdd-evidence.md` |
| S2-F06-S / S2-F07-S, AC-S2-07–14 | Yes | Yes | Yes | `docs/evidence/d2-s2/issue-103-tdd-evidence.md`: 6 unit suites/18 passed; 12 API suites/69 passed; 3 E2E passed |
| S2-F10-P, AC-S2-15–17 | Yes | Yes | Yes | `docs/evidence/d2-s2/performance-benchmark.md`: p95 187.46 ms |
| S3-F11-R, AC-S3-01–09 | Yes | Yes | Yes | `reminder-schedules.test.ts`: 6 passed; `docs/evidence/d2-s3/issue-106-reminders.md` |
| S3-F10-Q, AC-S3-13–14 | No | No | No — planned | `S3-F10-Q-verification-hardening.md`; NFR-06 remains 83.05% pending re-measurement |
| S3-F10-O, AC-S3-10–12 | No | No | No — planned | `S3-F10-O-operational-readiness.md` |

### Uncovered requirements and planned final verification

- **NFR-03:** bcrypt storage has test evidence, but the plaintext-log inspection remains planned; do not mark the entire NFR as passed.
- **NFR-06:** the recorded 83.05% API statement coverage is below the stated 90% target. Run the S3-F10-Q coverage command on the final candidate and record scope, exclusions, totals, and permission-route mapping.
- **NFR-07:** perform managed-secret and restore/recovery verification for the release candidate; until then it remains planned.
- **Baseline UI gaps:** AC-34, AC-38, AC-44, and AC-50 lack component-level automated coverage; retain build/E2E evidence and run the final release regression.

