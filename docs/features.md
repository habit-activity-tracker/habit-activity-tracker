# Final feature inventory — Delivery 3

This is the released-behaviour inventory at `d3-staging` merge `0d876ab`. `PASS` means the cited evidence covers the stated feature scope; `INCOMPLETE` keeps a known gap visible and is not a failure claim.

| ID | Feature and released behaviour | Requirements / sprint | Actual evidence | Status / remaining gap |
|---|---|---|---|---|
| F-01 | Login, `/me`, logout, server-side expiring sessions and bcrypt password comparison. | FR-01–02; S1 | `api/tests/api/auth.test.ts`; Issue 2 malformed-JSON regression | INCOMPLETE — deployed-log inspection for plaintext credentials remains GAP-03. |
| F-02 | Role and owner isolation: managers cannot access participant goals; other participants receive a safe 404. | FR-08, FR-14, BR-11, NFR-02; S1–S3 | `access-control.sprint2.test.ts`; D3 access matrix (74/74 Docker and Cloud Run) | PASS. |
| F-03 | Managers create/update templates; authenticated users list active templates; unit is immutable. | FR-03–05, BR-10; S1 | `templates.create.test.ts`, `templates.list.test.ts`, `templates.update.test.ts` | PASS. |
| F-04 | Participant goal creation plus owner-scoped, versioned revisions; direct goal PATCH/DELETE is absent. | FR-06–08, BR-08, BR-10; S1–S2 | `goals.test.ts` `TEST-AC-43`; `goals.revision.test.ts`; Issue 130 UI evidence | PASS. |
| F-05 | One daily record per goal/date, inclusive template bounds, owner isolation, and CR-01's today through seven-days-ago window in `APP_TIMEZONE`. | FR-09, FR-12–13; BR-04–07, BR-09; S1 / CR-01 | `api/tests/api/records.test.ts` (duplicate DB constraint, bounds, and CR-01 boundary tests) | PASS. |
| F-06 | Total-period progress, one-decimal half-up rounding, cap at 100, and deterministic streak. | FR-11; BR-01–03; S1–S2 | `progress.test.ts`, `unit/progress.test.ts`, `unit/streak.test.ts`, `sprint2.history.test.ts` | PASS. |
| F-07 | Owner-only summary/history/progress and revision context; released revision UI. | FR-08, FR-11, FR-13, FR-15; S1–S2 | `sprint2.history.test.ts`; `web/src/pages/GoalPage.tsx`; Issue 130 E2E evidence | INCOMPLETE — baseline component coverage for AC-44/AC-50 is absent. |
| F-08 | Shared validation and documented JSON error envelope, including malformed JSON as `400 INVALID_JSON`. | FR-07, FR-12, NFR-05; S1–S3 | validator suites; `auth.test.ts` TEST-01.9; Issue 2 evidence | PASS. |
| F-09 | React dashboard/forms with loading, empty, success and error states. | FR-15; S1 | build/E2E evidence | INCOMPLETE — AC-34, AC-38, AC-44 and AC-50 lack dedicated component tests. |
| F-10 | Deployment, security and recovery baseline: Cloud Run/Cloud SQL, coverage measurement, and isolated restore. | NFR-01, NFR-03, NFR-04, NFR-06–07; S1–S3 | performance benchmark; `docs/evidence/d3/issue-5-coverage-readiness.md` | INCOMPLETE — coverage is 88.24% vs 90%; NFR-07 RPO is not fully measured; GAP-03 remains. |
| F-11 | Up to three owner-scoped reminder schedules per active goal; strict-future occurrence; no notification delivery. | FR-16, BR-11, NFR-02, NFR-05; S3 | `reminder-schedules.test.ts`, including TEST-S3-09; D3 access matrix | PASS. |

The System SDS and contracts appendix use this inventory as their feature-status reference. F-11 means schedule representation only: it does not imply email, push, webhook, queue, channel, opt-in, or dispatch behaviour.
