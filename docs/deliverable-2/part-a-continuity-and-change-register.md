# Deliverable 2 — Part A: Sprint 1 Continuity and Change Register

**Status:** Draft pending independent rerun and partner review
**Issue:** Delivery 2 Issue 2
**Lead:** Kulchaya Paipinij
**Partner:** Chayanit Kuntanarumitkul
**Baseline:** `af3510201f11cda5c684e03f2f213401f974a8b1` (`af35102`)
**Accepted Sprint 1 reference:** `v0.1.1-sprint1` at `85db268`
**Date:** 24 November 2026 (Asia/Bangkok)

## Purpose and acceptance gate

This document demonstrates that the accepted Sprint 1 journey remains available
while recording every material finding carried from Labs 5–7. It does not claim
that a planned check passed without a command, output, or linked evidence.

Issue 2 is complete only when:

- [x] Kulchaya reran the local unit/API/build path on a clean Docker PostgreSQL service; the E2E journey exposed the known fixed-date fixture problem recorded as E2E-01.
- [x] Chayanit independently reruns the same journey and compares counts.
- [x] The register below is reconciled against the Lab 5–7 evidence and GitHub issues.
- [x] Every unresolved item has an owner, next action, and target milestone.
- [x] Partner review is recorded on the Issue 2 PR.

## Sprint 1 continuity matrix

| Area | Preserved behavior to verify | Existing evidence/source | Current status | Rerun evidence |
|---|---|---|---|---|
| F-01 authentication | Valid login creates a session; invalid email and unknown credentials retain documented 400/401 responses. | `docs/sprints/sprint-1/F-01-auth.md`; Lab 7 post-deploy evidence | Preserved; production smoke did not include credentialed login. | [x] Confirmed by Chayanit rerun on commit `c5d3122`; `auth.test.ts` (11 tests passed), `auth.spec.ts` passed. |
| F-02 access control | Unauthenticated requests return 401; manager/unauthorized role returns 403; private ownership is not disclosed. | `F-02-access-control.md`; `api/tests/api/*` permission tests | Preserved; B-11 evidence confirms Bob 404 and Manager 403 on final revision. | [x] Confirmed by Chayanit rerun on commit `c5d3122`; permission tests across all 9 API suites passed. |
| F-03 templates | Participant/manager visibility and manager-only template maintenance remain intact. | `F-03-*.md`; `api/tests/api/templates*.test.ts` | Preserved; TEST-21 fixture change is recorded below. | [x] Confirmed by Chayanit rerun on commit `c5d3122`; `templates.list`, `templates.create`, `templates.update` suites passed. |
| F-04 goals | Participant-owned goal creation validates target and dates; inactive/unknown templates are rejected. | `F-04-create-goal.md`; `api/tests/api/goals.test.ts` | Preserved by API suite evidence. | [x] Confirmed by Chayanit rerun on commit `c5d3122`; `goals.test.ts` (8 tests passed). |
| F-05 records | Owner can create/read records; future/out-of-period dates remain rejected; new 7-day cutoff applies only to new creation; duplicate remains 409. | `F-05-record-daily.md`; `api/tests/api/records.test.ts`; Lab 7 B-09/B-10/B-12 | CR-01 released and post-deploy checks passed. | [x] Confirmed by Chayanit rerun on commit `c5d3122`; `records.test.ts` (19 tests passed including AC-12a 7-day cutoff). |
| F-06/F-07 progress/history | Existing records remain readable and counted; total progress remains half-up rounded and capped at 100%. | `F-06-progress-history.md`; `progress.test.ts`; B-13 | Preserved; B-13 shows older records still counted. | [x] Confirmed by Chayanit rerun on commit `c5d3122`; unit and API progress suites passed. |
| F-10 build/deployment baseline | Build, migration, smoke and secret-handling checks remain reproducible. | `docs/evidence/workflow-evidence.md`; Lab 5 deployment evidence | Final deployment succeeded; local continuity rerun still pending. | [x] Confirmed by Chayanit rerun on commit `c5d3122`; API + Web build and smoke/seed tests passed. |

## Required local rerun

Run from the repository root after starting the repository PostgreSQL service and
using an isolated test database. Record the commit, date/time, machine, and all
pass/fail/skip counts.

```powershell
docker compose up -d --wait postgres
docker compose ps
npm run test:unit
npm run test:api
npm run test:e2e
npm run build
```

The initial workspace check on 24 November 2026 showed no running Compose
services; the service was started before the rerun recorded below.

### Kulchaya local rerun record

The PostgreSQL service was then started with `docker compose up -d --wait
postgres` and reported healthy on `localhost:5433`. Results below were run on
commit `64823e9` at 24 November 2026 13:42 ICT:

| Command | Result | Evidence |
|---|---|---|
| `npm run test:unit` | PASS — 4 suites, 9 passed, 0 failed, 0 skipped | Jest output |
| `npm run test:api` | PASS — 9 suites, 56 passed, 0 failed, 0 skipped | Jest output |
| `npm run test:e2e` (initial rerun) | FAIL — 2 passed, 1 failed, 0 skipped | `e2e/journey.spec.ts` exposed the fixed-date problem: `2026-11-04` was rejected and progress remained `0.0%` |
| `npm run build` | PASS — API TypeScript build and web Vite build completed | npm build output |

The initial E2E failure was not hidden or counted as a pass. E2E-01 was fixed in
commit `1619417` by deriving the journey goal/activity date from the current
`Asia/Bangkok` calendar date minus one day. The final rerun then passed:

```text
npm run test:e2e
3 passed, 0 failed, 0 skipped
```

### Chayanit independent rerun record

The PostgreSQL service was running on Docker Compose (`localhost:5433`). Results below were run independently by Chayanit Kuntanarumitkul on commit `c5d3122` at 24 November 2026 14:05 ICT:

| Command | Result | Evidence |
|---|---|---|
| `npm run test:unit` | PASS — 4 suites, 9 passed, 0 failed, 0 skipped | Jest output (Time: 1.887 s) |
| `npm run test:api` | PASS — 9 suites, 56 passed, 0 failed, 0 skipped | Jest output (Time: 97.802 s) |
| `npm run test:e2e` | PASS — 3 passed, 0 failed, 0 skipped | Playwright output (Time: 26.9 s) with runtime-relative date fixture |
| `npm run build` | PASS — API TypeScript build and web Vite build completed | npm build output (built in 3.36s) |

All test counts and results match Kulchaya's post-fix rerun exactly: 4 unit suites (9 passed), 9 API suites (56 passed), 3 E2E tests (3 passed), and successful workspace build.

## Change and finding register

| ID | Source | Finding / preserved decision | Status at Issue 2 | Owner | Next action / milestone |
|---|---|---|---|---|---|
| CR-01 | Lab 7 approved change, #73/#75 | New records accept today through seven calendar days ago in `APP_TIMEZONE`; 8+ days old returns 400. Existing records, ownership, period checks, and duplicate rule remain. | Released and deployed | Team | Preserve regression and post-deploy evidence; Final Delivery |
| K-1 | Lab 6 | Generic duplicate-template message is a known limitation. | Accepted limitation | Team | Reassess only if an approved scope change is made; Final Delivery |
| K-2 | Lab 6 | Invalid login email validation was fixed and re-tested. | Resolved | Team | Preserve test and deployment evidence |
| K-3 | Lab 6 | Unit-test banner/coverage presentation limitation. | Accepted limitation | Team | Improve with later test/reporting work; Final Delivery |
| PD-03a | Lab 7, Issue #89 | Invalid JSON sent to `POST /api/auth/login` returned 500 `INTERNAL_ERROR` instead of a documented 4xx response. No data exposure observed. | Minor, deferred outside Lab 7 scope | Team Ctrl C + Chaya | Decide and implement follow-up with contract, RED/GREEN, release and retest; Deliverable 2 / Final Delivery |
| OP-01 | Lab 7 | Public smoke covered health, readiness, UI and unauthenticated API; credentialed login was skipped because no smoke credentials were configured. | Evidence gap | Chayanit | Add safe authenticated smoke check without committing credentials; Final Delivery |
| OP-02 | Lab 7 | Runtime `GIT_COMMIT_SHA` was stale although image tag/digest and Cloud Run revision provided traceability. | Remaining technical debt | Chayanit | Set/remove the variable from deployment metadata and verify; Final Delivery |
| EV-01 | Lab 7, PR #83 | TEST-21 changed from fixed `2026-11-01` to `2026-11-04` under injected `today = 2026-11-10`; assertion purpose was unchanged. | Resolved at `f6c07fa` | Kulchaya | Preserve fixture audit and rerun evidence |
| CI-01 | Lab 7 retrospective | CI previously did not trigger for PRs targeting the staging branch. | Delivery gate item | Chayanit | Verify `test-and-docker` on `d2-staging` before other Delivery 2 merges |
| E2E-01 | Current source audit and 24 Nov rerun | `e2e/journey.spec.ts` initially used fixed `2026-11-04`; commit `1619417` changed it to an `Asia/Bangkok` runtime-relative date. Final E2E rerun: 3 passed, 0 failed, 0 skipped. | Resolved for Issue 2 | Kulchaya | Preserve the runtime-relative fixture and rerun if the date/time or API clock contract changes |
| NFR-06-GAP | Lab 7 metrics | Recorded API statement coverage was 83.05%; target is at least 90% of service/domain rules plus endpoint permission coverage. | Remaining gap | Chayanit | Re-measure on the final candidate and disclose or close; Final Delivery |
| SEC-01 | Sprint 1 limitation | No CSRF tokens or rate limiting in the accepted baseline. | Technical debt, not current scope | Team | Obtain scope approval before implementation; Sprint 3/backlog |
| OBS-01 | Lab 7 retrospective | Structured safe application error logging is absent, slowing diagnosis of PD-03a. | Technical debt, not current scope | Team | Decide logging contract; never log passwords/private payloads; Final Delivery |

## Evidence reconciliation rules

- A test is marked **PASS** only with a command, commit/revision, timestamp, and
  readable output or screenshot.
- A fixture change is recorded only when the requirement changed and the original
  assertion remains meaningful; no test may be deleted, skipped, or weakened.
- `CR-01` applies to new record creation. Existing rows are not rewritten and
  remain readable and included in progress calculations.
- Issue #89 is described as a deferred Minor follow-up, not as a fixed defect.
- Sprint 2/Sprint 3 planned features are not counted as Sprint 1 continuity
  evidence.

## Partner review

- [x] Chayanit reviewed the continuity matrix against the actual Sprint 1 test files.
- [x] Chayanit reviewed the change register against Lab 5, Lab 6, and Lab 7 evidence.
- [x] Review comment includes concrete findings, not only “LGTM”.

