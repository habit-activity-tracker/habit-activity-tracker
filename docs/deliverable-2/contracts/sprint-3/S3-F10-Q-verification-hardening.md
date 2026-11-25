# S3-F10-Q — Verification hardening and coverage closure

## Status and requirements

**Status:** `planned`. This contract governs measurement and tests; it does not redefine product behavior.

- **Feature / requirement:** F-10, NFR-06.
- **Baseline gap:** API statement coverage was 83.05% in the Lab 7 record. The target remains at least 90% of applicable service/domain rules plus all endpoint permission cases.
- **Dependencies:** D2-GATE-01; merged Sprint 2/Sprint 3 endpoints; a dedicated implementation issue/branch `test/s3-coverage`.

## Measurement contract

1. Coverage is measured on the candidate commit in local Docker/CI with the same test command and coverage configuration recorded in evidence.
2. The report states statement, branch, function, and line percentages separately. A single aggregate percentage cannot hide an untested domain/service path.
3. The review maps every current endpoint's 401/403/404 ownership behavior to an automated test. New F-11 endpoints must join the matrix after Issue 9.
4. Exclusions are listed by file/path and rationale; generated output, migrations, type-only files, and startup glue may be excluded, but domain/service logic cannot be excluded merely to raise a percentage.
5. If the target is not reached, publish the measured result, uncovered domain rules, risk, owner, and remediation issue. Do not mark this feature accepted.

## Acceptance criteria

| ID | Observable outcome |
|---|---|
| **AC-S3-13** | The candidate coverage report shows at least 90% coverage for the defined service/domain rule scope, with transparent configuration and exclusions. |
| **AC-S3-14** | Automated permission coverage exists for every protected endpoint in the candidate, including F-11 when implemented, and the report/evidence identifies executed pass/fail/skipped counts. |

## Software Test Specification

| Test ID | AC | Level | Setup / action | Expected result |
|---|---|---|---|---|
| TEST-S3-13a | 13 | Coverage | Run documented coverage command on candidate after clean install/migrations. | Report contains statement/branch/function/line values and scope; service/domain result ≥90%. |
| TEST-S3-13b | 13 | Review | Inspect coverage config and exclusions against source paths. | No service/domain file is hidden without approved rationale. |
| TEST-S3-14a | 14 | API matrix | Run 401/403/404/owner cases for every protected route, including reminder create/list. | All expected cases pass; no private response body leaks. |
| TEST-S3-14b | 14 | Regression | Run full unit/API suite and record passed/failed/skipped counts, command, commit, environment. | Zero unexplained failures/skips; evidence is reproducible. |

## Evidence and Definition of Done

Store raw summary plus a readable table under `docs/evidence/d2-s3/coverage/`, recording candidate SHA, command, environment, timestamp, configuration/exclusions, percentages, test totals, and permission-route mapping. Do not include secrets, cookies, or database URLs.

- `implemented` only after tests/configuration are committed.
- `tested` only after measurement is executed.
- `accepted` only after peer review confirms AC-S3-13 and AC-S3-14; otherwise retain `planned`/`in progress` and link remediation.
