# Deliverable 2 Scope Freeze

**Version:** 1.2
**Date:** 24 November 2026 (Asia/Bangkok)
**Lead:** Chayanit Kuntanarumitkul (67070503408)
**Reviewer:** Kulchaya Paipinij (67070503406)
**Issue:** Delivery 2 Issue 1 — Scope freeze and Issue board setup

## Revision history

| Version | Date | Change | Reason |
|---|---|---|---|
| 1.0 | 23 November 2026 | Initial scope allocation, Sprint 3 workflow selection, baseline decisions, and carried-over findings. | Freeze the Deliverable 2 baseline before contracts. |
| 1.1 | 24 November 2026 | Added CI gate sequencing, AC reservations, Sprint 3 ownership/dependencies, dedicated coverage branch, and F-11 contract decisions. | Address reviewer findings without overwriting the original scope decision. |
| 1.2 | 24 November 2026 | Clarified that CI-01 is the sole bootstrap exception, scope freeze waits for `d2-staging`, and planned Issue numbers are not GitHub Issue numbers. | Remove gate ambiguity and prevent inaccurate issue references. |

## Baseline and source of truth

This scope freeze starts from `main` commit `af3510201f11cda5c684e03f2f213401f974a8b1` (`af35102`). It was deployed as Cloud Run revision `habit-tracker-00011-rr7` and is the current candidate baseline. The original accepted Sprint 1 baseline remains tag `v0.1.1-sprint1` at `85db268`.

The allocation below preserves the approved three-sprint plan in `docs/sprints/plan.md`, the SRS decisions AD-01 to AD-18, and the feature inventory. It adds delivery identifiers only where one existing feature contains several separately verifiable Sprint 2 responsibilities; it does not renumber the baseline feature inventory.

## Sprint 2 scope — Goal evolution and insights

| Delivery ID | Canonical feature | Requirement / rule | Short description | Planned acceptance criteria | Issue / branch | Dependencies | Owner |
|---|---|---|---|---|---|---|---|
| S2-F04-R | F-04 — Goal lifecycle | FR-06, FR-07, FR-08, BR-08, BR-10, NFR-02, NFR-05 | Versioned participant-owned goal revision with an explicit effective date; existing activity records remain an immutable audit trail. | AC-S2-01 to AC-S2-06 | Plan Issue 5; GitHub #TBD; `feature/s2-f04-goal-revision` | D2-GATE-01 | Chayanit |
| S2-F06-S | F-06 — Progress calculation | FR-11, BR-01, BR-02, BR-03 | Calculate a deterministic streak from persisted, valid daily records and expose it in the goal summary without changing the approved total-progress calculation. | AC-S2-07 to AC-S2-10 | Plan Issue 6; GitHub #TBD; `feature/s2-f06-streak` | D2-GATE-01, S2-F04-R | Kulchaya |
| S2-F07-S | F-07 — History and progress views | FR-08, FR-11, FR-13, FR-15, NFR-02, NFR-05 | Provide owner-only history summaries that make progress, streak, and goal-revision context understandable. | AC-S2-11 to AC-S2-14 | Plan Issue 6; GitHub #TBD; `feature/s2-f07-history-summary` | D2-GATE-01, S2-F04-R, S2-F06-S | Kulchaya |
| S2-F10-P | F-10 — Testable deployment/security baseline | NFR-01 | Produce reproducible performance evidence: a seeded 100,000-record data set and p95 authenticated-read/API measurement at or below 500 ms, excluding network transfer. | AC-S2-15 to AC-S2-17 | Plan Issue 5; GitHub #TBD; `feature/s2-f10-performance` | D2-GATE-01 | Chayanit |

### Sprint 2 boundary decisions

- `S2-F04-R` changes the goal lifecycle only through a versioned revision. It must not edit or delete a past `ActivityRecord`, weaken ownership checks, or allow a manager to access participant data.
- `S2-F06-S` and `S2-F07-S` extend the existing summary/history responsibilities. They do not replace BR-02/BR-03: percent progress remains `total / target * 100`, half-up rounded to one decimal and capped at 100.
- `S2-F10-P` is a non-UI engineering feature. Measure in the reproducible local Docker Compose environment first, using the documented host/specification, fixed seed generator, warm-up, request count, query endpoint and percentile calculation. Cloud Run/Cloud SQL measurement is optional corroborating evidence only; do not seed production or make the Sprint 2 result depend on its cost/capacity.
- Integration order is mandatory: `S2-F04-R → S2-F06-S → S2-F07-S`. `S2-F10-P` may proceed independently after D2-GATE-01.

### Delivery gate

`D2-GATE-01` means all of the following have happened:

1. CI-01 was delivered as the one bootstrap exception: PR `ci/d2-staging-trigger` went directly to `main`, received Kulchaya's substantive review, and its `test-and-docker` check passed. The CI-01 PR changes only the workflow trigger and must also attach a local `npm test` and build result for review.
2. `d2-staging` was created from that merged `main` commit.
3. A small verification PR into `d2-staging` ran `test-and-docker` successfully.

After D2-GATE-01 passes, **every** Delivery 2 PR targeting `d2-staging`—including the scope-freeze/Issue 1 PR, contracts, implementation, tests, documentation, evidence, and release preparation—must have the CI check and partner review. CI-01 is the only pre-gate exception; no other Delivery 2 PR may merge before the gate passes. The CI-01 implementation branch is `ci/d2-staging-trigger`.

### Contract and acceptance-criterion reservation

The ranges in the Sprint 2 table are reserved identifiers only; complete, numbered AC and STS rows must be written, reviewed, and committed in the pre-implementation contracts for Issue 3 and Issue 4. Planned locations are `docs/deliverable-2/contracts/sprint-2/` and the Sprint 2 completion table. They are not evidence of implementation or passing verification at scope freeze.

**Required Issue 3 action:** The S2-F04-R contract must answer the F-11 dependency explicitly: when a revision shortens a goal's `end_date` to before the current `APP_TIMEZONE` date, an existing associated reminder schedule remains persisted but `next_occurrence_at` becomes `null`. Kulchaya must review this decision before the contract is merged.

## Sprint 3 scope — Reminder scheduling and operational readiness

| Delivery ID | Canonical feature | Requirement / rule | Current status | Reserved AC | Issue / branch | Owner / reviewer | Dependencies | Remaining action |
|---|---|---|---|---|---|---|---|---|
| S3-F11-R | F-11 — Reminder scheduling and occurrence rule | FR-16, BR-11, AD-15, AD-17, NFR-02, NFR-05 | Planned | AC-S3-01 to AC-S3-09 | Plan Issue 9; GitHub #TBD; `feature/s3-f11-reminder-schedule` | Kulchaya / Chayanit | D2-GATE-01, S2-F04-R contract decision | Implement, test, and accept the selected domain workflow below. |
| S3-F10-O | F-10 — Operational readiness | NFR-07 | Planned | AC-S3-10 to AC-S3-12 | Plan Issues 12/14; GitHub #TBD; `deploy/d2-candidate`, `docs/d2-final` | Chayanit / Kulchaya | D2-GATE-01, release candidate | Run and record recovery/restore evidence and final deployment verification. |
| S3-F10-Q | F-10 — Verification hardening | NFR-06 | Planned | AC-S3-13 to AC-S3-14 | Issue #TBD at board creation; `test/s3-coverage` | Chayanit / Kulchaya | D2-GATE-01 | Re-measure coverage and close the service/domain-rule gap to the documented 90% target, or disclose the remaining gap. |
| S3-Q01 | Technical-debt security hardening (not an approved baseline FR/BR) | CSRF and rate-limit gap | Planned | None — debt, not contractual AC | Backlog; branch only after approved scope decision | Unassigned / both review | Approved scope decision | Obtain scope decision; do not claim implementation in Delivery 2 without it. |
| S3-Q02 | Technical-debt observability (not an approved baseline FR/BR) | Structured safe error logging | Planned | None — debt, not contractual AC | Backlog; branch only after approved scope decision | Unassigned / both review | Approved scope decision | Decide whether to add redacted error logging; passwords and private payloads must never be logged. |

## Chosen Sprint 3 workflow to implement now

**Feature:** `S3-F11-R` / canonical F-11 — participant reminder schedule and next-occurrence rule.

**Workflow:** An authenticated participant creates a schedule for one of their own goals (`local_time`, selected `days_of_week`, `enabled`), retrieves only their own schedules, and sees both the saved schedule and its calculated next occurrence after reload. The service persists the schedule but deliberately does not dispatch a notification.

**Meaningful rule and rejection cases:**

1. A schedule is accepted only for an existing goal owned by the authenticated participant and whose `end_date` is today or later in `APP_TIMEZONE`.
2. `days_of_week` must contain one to seven unique ISO weekday values (`1` Monday through `7` Sunday); an empty list, duplicate, or out-of-range value is rejected. A goal may have at most three schedules.
3. The API calculates `next_occurrence_at` from persisted schedule data and an injected clock in `APP_TIMEZONE`. It returns the first selected local weekday/time strictly after “now”, including cross-midnight and cross-week boundaries; the calculation does not mutate the stored schedule.
4. Another participant receives privacy-safe `404`; a Program Manager receives `403`; an unauthenticated caller receives `401`.
5. No notification job, provider call, email, push message, or external dispatch is created; this is the approved AD-15/AD-17 boundary.

**Reserved AC coverage:** AC-S3-01 schedule creation and reload persistence; AC-S3-02 owner-only goal selection; AC-S3-03 local-time/day validation; AC-S3-04 unique weekday and maximum-three-schedules rule; AC-S3-05 inactive/ended-goal rejection; AC-S3-06 next occurrence in `APP_TIMEZONE`; AC-S3-07 midnight/week boundary; AC-S3-08 access denial and ownership privacy; AC-S3-09 no-dispatch rule. The Issue 8 contract must add STS cases for each before Issue 9 implementation begins.

**Open questions to resolve in the F-11 contract before implementation:**

1. If a goal ends after a schedule has been created, `next_occurrence_at` must be returned as `null` rather than an error; the persisted schedule remains readable to its owner.
2. A schedule belongs to the stable `goal_id`, not a historical goal-revision row. The S2-F04-R contract must state whether a revision that shortens `end_date` triggers the null result in rule 1; the selected default is yes.
3. If `enabled=false`, `next_occurrence_at` is `null`; the schedule remains persisted and can later be re-enabled by its owner if an update lifecycle is included in the F-11 contract. If update is not included, the contract must explicitly say so.

**Why this is feasible by 27 November:** it is a narrowly bounded model, migration, owner-scoped API and one focused UI path. It reuses established session, goal ownership, error, migration, seed, and test patterns without integrating a notification provider.

## Baseline changes and preserved decisions

| ID | Type | Change or decision | Affected requirement / feature | Decision and rationale | Approved / released version |
|---|---|---|---|---|---|
| CR-01 | Approved change | Limit new activity recording to today through seven calendar days before today in `APP_TIMEZONE`. | FR-12; BR-07; BR-09; F-05 | Approved adaptive-maintenance change from Lab 7. It bounds retrospective entry while retaining the existing goal-period and duplicate rules. | F-05 contract v1.1; release `1f425cc`, deployed baseline `af35102` |
| AD-18 | Preserved decision | A goal target is a period total, not a per-day value; template min/max constrain one record only. | FR-06, FR-07; BR-01 | This is an existing clarification, not a new change request. A revision must not incorrectly cap a period target by the template's daily range. | Approved baseline decision AD-18 |
| AD-15/17 | Preserved decision | F-11 represents schedules only; notification delivery, channels, and opt-in are excluded. | FR-16; F-11; BR-11 | Existing TA/workshop scope decision. The selected workflow therefore proves scheduling-domain behavior without claiming notification delivery. | Approved baseline decisions AD-15 and AD-17 |

## Carried-over findings and operational follow-up

These findings are deliberately visible to Part A/change-register work. They are not silently treated as completed Sprint 2 or Sprint 3 features.

| ID | Source | Finding / decision at scope freeze | Status and next action |
|---|---|---|---|
| PD-03a | Lab 7 post-deploy check | Invalid JSON submitted to `POST /api/auth/login` returned `500 INTERNAL_ERROR`; valid malformed-email and unknown-user cases retained their expected 400/401 behavior. The evidence refers to GitHub Issue #89. | Remaining. Triage and fix or explicitly defer with re-test evidence before the final release. |
| OP-01 | Lab 7 smoke test | Public health, readiness, UI and unauthenticated-template checks passed; login was skipped because optional smoke credentials were not configured. | Remaining evidence gap. Open a board issue; add a safe authenticated post-deploy check using private handoff credentials or a controlled seeded account; never commit credentials. |
| OP-02 | Lab 7 deployment evidence | The deployed image tag/digest identifies the commit correctly, but the application `GIT_COMMIT_SHA` environment value was stale. | Remaining. Open a board issue; correct or remove the misleading display/variable and verify the candidate version by tag, image digest, Cloud Run revision, and CI run. |
| EV-01 | Lab 7 regression evidence | `TEST-21` fixture was updated to an injected date within the new seven-day window; the assertion purpose was unchanged. | Resolved at `f6c07fa`; preserve the regression evidence. |
| CI-01 | Lab 7 process retrospective | PRs into `lab7-staging` received zero CI checks because the workflow triggered only for `main`, `lab5-staging`, and `lab6-staging`. | Blocking prerequisite; see Delivery gate (D2-GATE-01). |
| E2E-01 | Lab 7 fixture audit / current E2E source | `e2e/journey.spec.ts` still uses fixed date `2026-11-04`, now outside the 7-day API window. | Remaining. Replace with an injected/current valid date and execute E2E before regression acceptance. |
| NFR-06-GAP | Lab 7 metrics | API statement coverage was recorded as 83.05%; NFR-06 requires at least 90% of service/domain rules plus all endpoint permission cases. | Remaining. Re-measure after Sprint 2 work and close or explicitly disclose the gap. |
| SEC-01 | Known limitation | CSRF tokens and rate limiting are not baseline requirements and were not implemented in Sprint 1. | Technical debt only unless an approved scope decision promotes it. |
| OBS-01 | Lab 7 retrospective | Safe structured error logging is absent, slowing diagnosis of PD-03a. | Technical debt only unless an approved scope decision promotes it. |

## Scope controls

1. Contracts for every row above must be committed and reviewed before its first implementation commit.
2. Any addition, removal, or materially changed acceptance criterion requires a new change-record entry; this file is not rewritten to erase prior decisions.
3. All Sprint 2 rows are required for Sprint 2 completion. They may not be moved to Sprint 3 without an approved baseline revision.
4. The Sprint 3 status vocabulary is `planned`, `in progress`, `implemented`, `tested`, and `accepted`. At this checkpoint only the chosen workflow is expected to reach implementation and tested status.
5. The final traceability matrix must identify actual test files/measurements and execution results. A planned or unexecuted check is never recorded as passing.

## Issue-board setup checklist

- [ ] Create milestone **Delivery 2**, due 29 November 2026.
- [ ] Create labels: `delivery-2`, `part-A`, `part-B`, `part-C`, `part-D`, `part-E`, `docs`, `feature`, `test`, `deploy`, `evidence`, `ci`.
- [ ] Create board columns: Backlog, Ready, In Progress, In Review, Done.
- [ ] Create and assign Delivery 2 Issues 2–14 from the approved issue plan; apply the milestone and relevant labels.
- [ ] Create the additional blocking CI issue for CI-01 (`ci/d2-staging-trigger`) and place it in In Progress before any contract or feature PR.
- [ ] After CI-01 is merged, create `d2-staging` from `main`; configure branch protection if the repository settings permit it.
- [ ] Create the follow-up coverage issue for S3-F10-Q (`test/s3-coverage`) without combining it with the access-control or release branches, then replace `Issue #TBD` with the actual GitHub issue number.
- [ ] Replace every `GitHub #TBD` with the actual GitHub issue number after the board Issues are created; link OP-01, OP-02, CI-01, E2E-01, NFR-06-GAP, SEC-01, and OBS-01 to their Part A/change-register entries.
- [ ] Keep Issue 1 in **In Progress** until Kulchaya has reviewed this scope freeze.
