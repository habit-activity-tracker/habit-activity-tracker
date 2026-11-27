# Issue 5 — Coverage and UI traceability evidence

- **Candidate commit:** `03231fdcd58b9aaf5add0b292ed5e074f7b0b4ba`
- **Branch:** `feature/d3-readiness-evidence`
- **Run date/time:** 27 November 2026, 21:56 ICT
- **Environment:** local Docker PostgreSQL service on port 5433
- **Coverage command:**
  `npx cross-env NODE_OPTIONS=--experimental-vm-modules jest --selectProjects api --runInBand --coverage --coverageReporters=text --coverageReporters=json-summary`

## Coverage result

| Scope | Statements | Branches | Functions | Lines |
|---|---:|---:|---:|---:|
| All instrumented API source | 88.17% (619/702) | 78.57% (341/434) | 91.42% (96/105) | 91.61% (546/596) |
| Service/domain scope (`src/services` + `src/validators`) | 88.24% (225/255) | 84.52% (213/252) | 100.00% (33/33) | 97.87% (184/188) |

The service/domain statement result is below the NFR-06 target of 90%. NFR-06 therefore remains a disclosed gap; this run does not claim AC-S3-13 as passed.

## Test execution supporting the measurement

| Suite | Result |
|---|---|
| API Jest suites | 14 passed |
| API tests | 83 passed, 0 failed, 0 skipped |

The raw Jest coverage summary was generated at `api/coverage/coverage-summary.json` during the run. It is not committed because coverage output is generated data; the table above records the reproducible summary and scope.

## UI traceability gap (GAP-02)

AC-34, AC-38, AC-44, and AC-50 have no dedicated component-level automated tests in this repository. The Delivery 3 contract does not add a component-test framework; the current evidence remains build/E2E and the acceptance matrix must keep these rows marked incomplete for component-test coverage. No unsupported PASS claim is made.

## Isolated restore exercise (GAP-06 / NFR-07)

- **Restore target:** `habit-tracker-restore-check-20261127` (isolated Cloud SQL instance; retained after this check)
- **Source backup:** `1795748400000`, PostgreSQL 16
- **Backup completed:** `2026-11-27T03:17:43Z`
- **Restore started:** `2026-11-27T16:28:41Z`
- **Restore operation:** Cloud SQL `RESTORE_VOLUME` completed in 12m 21.405s; the target reached `RUNNABLE`.
- **Isolated API commit:** `9d7b6b4`
- **API readiness completed:** `2026-11-27T17:26:03Z`, returning `{"status":"ready"}` from `GET /api/ready`.

The restored target contained all seven expected migrations (`001-initialize.sql` through `007-reminder-schedules.sql`) and data from the backup. The target and the live source were deliberately not claimed to be equal: the current source had received data after the backup. The observed counts were:

| Table | Restore target | Source at comparison time |
|---|---:|---:|
| users | 3 | 3 |
| activity_templates | 6 | 14 |
| goals | 21 | 37 |
| daily_records | 31 | 39 |
| goal_revisions | 13 | 37 |
| reminder_schedules | 8 | 16 |

The readiness check ran a Cloud Shell local API process connected only to the restore target through the Cloud SQL Auth Proxy. It ran neither migration nor seed commands; `GET /api/ready` performs `SELECT 1`. Source DB, Production Cloud Run, and production configuration were not modified. The readiness test did not use a production database secret. The target-only SQL user `restore_readiness` remains on the retained target; its password is not recorded here.

| Measure | Calculation | Result |
|---|---|---|
| RTO | Restore start to isolated API readiness: 57m 22s | **PASS** — target ≤ 4h |
| Backup age at restore start | Backup completion to restore start: 13h 10m 58s | Within the 24h target |

The backup age is not a complete end-to-end RPO measurement because no incident time was recorded. This is a completed isolated restore exercise for GAP-06. It does not change the separately measured NFR-06 coverage result or the GAP-02 component-test status.

## Remaining work

- Add focused component tests in the final-delivery test plan, or explicitly retain the four UI rows as incomplete.
- Increase service/domain statement coverage to at least 90%, or retain this measured gap with an owner and remediation issue.
