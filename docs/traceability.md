# Final requirements traceability matrix — Delivery 3

**Baseline:** `d3-staging` merge `0d876ab` (27 November 2026). Results record executed evidence only. `INCOMPLETE` means the target, AC, or evidence scope is not fully met; it is never a PASS claim. Detailed contracts remain in `docs/deliverable-2/contracts/` and `docs/deliverable-3/contract-amendments.md`.

**Document links:** [SRS](srs.md) defines the FR/BR/NFR requirements; [System SDS](system-sds.md) defines the architecture, data model, access design, and error contract; [Sprint 1 contracts and STS](sprints/sprint-1/sts.md) define the baseline AC/test IDs; the [Sprint 2/Sprint 3 contracts](deliverable-2/contracts/) define later AC and STS; and the [Delivery 3 contract amendments](deliverable-3/contract-amendments.md) record approved changes and their test obligations.

| ID | Feature | Sprint | AC / measurable target | Planned test | Actual test or evidence | Result | Commit |
|---|---|---|---|---|---|---|---|
| FR-01 | F-01 | S1 | AC-01–02b: login and malformed JSON | auth integration | `api/tests/api/auth.test.ts`; TEST-01.9 | PASS | `5ba5905` |
| FR-02 | F-01 | S1 | AC-03–05: current user/logout | auth integration | `api/tests/api/auth.test.ts` | PASS | `c5d3122` |
| FR-03 | F-03 | S1 | AC-31–34 create template | manager create test | `templates.create.test.ts` | INCOMPLETE — AC-34 component test absent | `c5d3122` |
| FR-04 | F-03 | S1 | AC-35–38 list/role/unit-read-only | list test | `templates.list.test.ts` | INCOMPLETE — AC-38 component test absent | `c5d3122` |
| FR-05 | F-03 | S1 | AC-17–22 permitted update/unit immutable | update test | `templates.update.test.ts` | PASS | `c5d3122` |
| FR-06 | F-04 | S1–S2 | create/revise owner goal | goal/revision tests | `goals.test.ts`; `goals.revision.test.ts`; Issue 130 E2E | INCOMPLETE — AC-44 component test absent | `b998e86` |
| FR-07 | F-04/F-08 | S1 | AC-42 positive target/date range | validator/API test | `goal.validator.test.ts`; `goals.test.ts` | PASS | `c5d3122` |
| FR-08 | F-02/F-04/F-07 | S1–S2 | owner-only list/retrieve | access matrix | `access-control.sprint2.test.ts`; D3 access matrix | PASS | `5a4f6a8` |
| FR-09 | F-05 | S1 | valid daily record | API integration | `records.test.ts` TEST-05.1 | PASS | `c5d3122` |
| FR-10 | F-05 | S1 | one row per `(goal_id, activity_date)`; 409, no overwrite | duplicate API + direct DB insert | `records.test.ts` TEST-05.4; direct `23505` assertion | PASS | `c5d3122` |
| FR-11 | F-06 | S1–S2 | formula, rounding, cap, summary | unit/API calculation | `unit/progress.test.ts`; `progress.test.ts`; `sprint2.history.test.ts` | PASS | `6da30d5` |
| FR-12 / CR-01 | F-05 | S1 / changed | range, period, no future; today..today-7 valid, day-8 invalid | boundary API test | `records.test.ts` TEST-05.2/05.3 and TEST-12.1a–i | PASS | `c5d3122` |
| FR-13 | F-05/F-07 | S1 | same template, independent goals | isolation API test | `records.test.ts` distinct-goal test | PASS | `c5d3122` |
| FR-14 | F-02/F-07 | S1–S3 | 401/403/404 privacy boundary | API + deployed matrix | `access-control.sprint2.test.ts`; matrix 74/74 | PASS | `5a4f6a8` |
| FR-15 | F-07/F-09 | S1–S2 | shared UI states/history/progress | E2E/component tests | Issue 130 E2E (4); build/E2E evidence | INCOMPLETE — AC-44 and AC-50 component tests absent | `b998e86` |
| FR-16 | F-11 | S3 | create/list ≤3, strict-future occurrence, no dispatch | schedule API test | `reminder-schedules.test.ts`, TEST-S3-09 | PASS | `ca4aad5` |
| BR-01 | F-06 | S1 | target is period-total | progress/goal test | `progress.test.ts`; goal target-above-template-max test | PASS | `c5d3122` |
| BR-02 | F-06 | S1 | total / target × 100 | calculation test | `unit/progress.test.ts` | PASS | `c5d3122` |
| BR-03 | F-06 | S1 | half-up 1dp, cap 100 | calculation test | `unit/progress.test.ts` | PASS | `c5d3122` |
| BR-04 | F-05 | S1 | duplicate rejected and original retained | API + direct database constraint | `records.test.ts` TEST-05.4; direct insert expects `23505` | PASS | `c5d3122` |
| BR-05 | F-05/F-07 | S1 | records scoped by goal | isolation API test | `records.test.ts` distinct-goal test | PASS | `c5d3122` |
| BR-06 | F-05 | S1 | inclusive `min_value ≤ quantity ≤ max_value` | min/max/out-of-range API test | `records.test.ts` TEST-05.2; `unit/record.validator.test.ts` | PASS | `c5d3122` |
| BR-07 | F-05/F-08 | S1 / CR-01 | Bangkok boundary/future/7-day cutoff | injected-clock API test | `records.test.ts` TEST-12.1g | PASS | `c5d3122` |
| BR-08 | F-04 | S1 | start ≤ end, positive target | validator/API test | `goal.validator.test.ts`; `goals.test.ts` | PASS | `c5d3122` |
| BR-09 | F-05 | S1 / CR-01 | record inside period; legacy rows readable | boundary API test | `records.test.ts` TEST-05.3, 12.1e/i | PASS | `c5d3122` |
| BR-10 | F-03/F-04 | S1–S2 | unit immutable; no direct goal edit/delete; revisions only | route/field rejection + revision | `templates.update.test.ts`; `goals.test.ts` TEST-AC-43; `goals.revision.test.ts` | PASS | `ca4aad5` |
| BR-11 | F-02/F-11 | S1–S3 | no cross-role/owner sharing and no dispatch | access + no-dispatch test | `access-control.sprint2.test.ts`; `reminder-schedules.test.ts` TEST-S3-09 | PASS | `ca4aad5` |
| NFR-01 | F-10 | S2 | 100,000 records; authenticated-read p95 ≤500 ms | seed/benchmark | `benchmark.test.ts`; 100,002 rows, p95 187.46 ms | PASS | `5b6353e` |
| NFR-02 | F-01/F-02/F-11 | S1–S3 | protected routes 401; role/ownership 403/404 with no private data | full access matrix | access suite; Docker/Cloud Run 74/74 matrix | PASS | `5a4f6a8` |
| NFR-03 | F-01/F-10 | S1 | bcrypt cost ≥12; no plaintext password in logs | auth + deployed-log inspection | `auth.test.ts` verifies bcrypt; no deployed-log inspection | INCOMPLETE — GAP-03 | `0d876ab` |
| NFR-04 | F-05/F-08 | S1 | UTC persistence; `APP_TIMEZONE` calendar behaviour | schema review + injected-clock test | migrations use timestamptz; `records.test.ts` TEST-12.1g | PASS | `c5d3122` |
| NFR-05 | F-08 | S1–S3 | documented error envelope and invalid JSON 400 | API contract tests | validator suites; `auth.test.ts` TEST-01.9; matrix | PASS | `5ba5905` |
| NFR-06 | F-10 | S3 | service/domain statements ≥90% | coverage run | Issue 5: 83 API tests; service/domain statements **88.24%** | INCOMPLETE — 1.76 points below target; AC-S3-13 not PASS | `3b4123a` |
| NFR-07 | F-10 | S3 | RTO ≤4h and RPO ≤24h | isolated restore/readiness | Issue 5: RTO 57m22s; backup age 13h10m58s; incident interval unmeasured | INCOMPLETE — RTO PASS, full RPO target unproven | `1cbe9db` |

## Explicit retained gaps

- AC-34, AC-38, AC-44 and AC-50 have no dedicated component-level automated test; they remain **INCOMPLETE**.
- The Issue 5 coverage run passed 83 API tests, but service/domain coverage was 88.24%, below 90%. AC-S3-13 remains **INCOMPLETE**, not PASS.
- GAP-06's isolated restore is complete and proves the measured RTO; it does not prove complete RPO because incident time was not captured.
