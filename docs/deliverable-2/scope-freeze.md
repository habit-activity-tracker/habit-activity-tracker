# Deliverable 2 Scope Freeze

**Version:** 1.0
**Date:** 23 November 2026 (Asia/Bangkok)
**Lead:** Chayanit Kuntanarumitkul (67070503408)
**Reviewer:** Kulchaya Paipinij (67070503406)
**Issue:** Delivery 2 Issue 1 — Scope freeze and Issue board setup

## Baseline and source of truth

This scope freeze starts from `main` commit `af3510201f11cda5c684e03f2f213401f974a8b1` (`af35102`). It was deployed as Cloud Run revision `habit-tracker-00011-rr7` and is the current candidate baseline. The original accepted Sprint 1 baseline remains tag `v0.1.1-sprint1` at `85db268`.

The allocation below preserves the approved three-sprint plan in `docs/sprints/plan.md`, the SRS decisions AD-01 to AD-18, and the feature inventory. It adds delivery identifiers only where one existing feature contains several separately verifiable Sprint 2 responsibilities; it does not renumber the baseline feature inventory.

## Sprint 2 scope — Goal evolution and insights

| Delivery ID | Canonical feature | Requirement / rule | Short description | Planned acceptance criteria | Owner |
|---|---|---|---|---|---|
| S2-F04-R | F-04 — Goal lifecycle | FR-06, FR-07, FR-08, BR-08, BR-10, NFR-02, NFR-05 | Versioned participant-owned goal revision with an explicit effective date; existing activity records remain an immutable audit trail. | AC-S2-01 to AC-S2-06 | Chayanit |
| S2-F06-S | F-06 — Progress calculation | FR-11, BR-01, BR-02, BR-03 | Calculate a deterministic streak from persisted, valid daily records and expose it in the goal summary without changing the approved total-progress calculation. | AC-S2-07 to AC-S2-10 | Kulchaya |
| S2-F07-S | F-07 — History and progress views | FR-08, FR-11, FR-13, FR-15, NFR-02, NFR-05 | Provide owner-only history summaries that make progress, streak, and goal-revision context understandable. | AC-S2-11 to AC-S2-14 | Kulchaya |
| S2-F10-P | F-10 — Testable deployment/security baseline | NFR-01 | Produce reproducible performance evidence: a seeded 100,000-record data set and p95 authenticated-read/API measurement at or below 500 ms, excluding network transfer. | AC-S2-15 to AC-S2-17 | Chayanit |

### Sprint 2 boundary decisions

- `S2-F04-R` changes the goal lifecycle only through a versioned revision. It must not edit or delete a past `ActivityRecord`, weaken ownership checks, or allow a manager to access participant data.
- `S2-F06-S` and `S2-F07-S` extend the existing summary/history responsibilities. They do not replace BR-02/BR-03: percent progress remains `total / target * 100`, half-up rounded to one decimal and capped at 100.
- `S2-F10-P` is a non-UI engineering feature. Its deliverable is executable performance test/data evidence, not an unsupported claim of performance.

## Sprint 3 scope — Reminder placeholder and operational readiness

| Delivery ID | Canonical feature | Requirement / rule | Status on scope-freeze baseline | Implement in Delivery 2? |
|---|---|---|---|---|
| S3-F11-R | F-11 — Reminder/schedule placeholder | FR-16, BR-11, AD-15, AD-17, NFR-02, NFR-05 | Planned. `ReminderSchedule` exists only as an SDS placeholder; there is no migration, API, UI, or test on `af35102`. | **Yes** |
| S3-F10-O | F-10 — Operational readiness | NFR-07 | In progress. Lab 5 established Docker, CI/CD, Cloud Run and managed-secret deployment; a current recovery/restore exercise and final operational verification remain. | No — contract and evidence work only |

## Chosen Sprint 3 workflow to implement now

**Feature:** `S3-F11-R` / canonical F-11 — participant reminder schedule placeholder.

**Workflow:** An authenticated participant creates a schedule for one of their own goals (`local_time`, selected `days_of_week`, `enabled`), retrieves only their own schedules, and sees the saved schedule after reload. The service persists the schedule but deliberately does not dispatch a notification.

**Meaningful rule and rejection cases:**

1. A schedule is accepted only for an existing goal owned by the authenticated participant.
2. Invalid local time or an empty/invalid day selection is rejected using the shared API error contract.
3. Another participant receives privacy-safe `404`; a Program Manager receives `403`; an unauthenticated caller receives `401`.
4. No notification job, provider call, email, push message, or external dispatch is created; this is the approved AD-15/AD-17 boundary.

**Why this is feasible by 27 November:** it is a narrowly bounded model, migration, owner-scoped API and one focused UI path. It reuses established session, goal ownership, error, migration, seed, and test patterns without integrating a notification provider.

## Approved baseline changes carried forward

| ID | Change | Affected requirement / feature | Decision and rationale | Approved / released version |
|---|---|---|---|---|
| CR-01 | Limit new activity recording to today through seven calendar days before today in `APP_TIMEZONE`. | FR-12; BR-07; BR-09; F-05 | Approved adaptive-maintenance change from Lab 7. It bounds retrospective entry while retaining the existing goal-period and duplicate rules. | F-05 contract v1.1; release `1f425cc`, deployed baseline `af35102` |
| CR-02 | A goal target is a period total, not a per-day value; template min/max constrain one record only. | FR-06, FR-07; BR-01; AD-18 | Preserved clarification needed for all goal-revision and summary work. A revision must not incorrectly cap a period target by the template's daily range. | AD-18; Lab 7 baseline |
| CR-03 | F-11 represents schedules only; notification delivery, channels, and opt-in are excluded. | FR-16; F-11; AD-15, AD-17 | Preserved TA/workshop scope decision. It makes the selected Sprint 3 workflow verifiable without claiming notification delivery. | AD-17; Sprint 3 contract to be written before code |

## Carried-over findings and operational follow-up

These findings are deliberately visible to Part A/change-register work. They are not silently treated as completed Sprint 2 or Sprint 3 features.

| ID | Source | Finding / decision at scope freeze | Status and next action |
|---|---|---|---|
| PD-03a | Lab 7 post-deploy check | Invalid JSON submitted to `POST /api/auth/login` returned `500 INTERNAL_ERROR`; valid malformed-email and unknown-user cases retained their expected 400/401 behavior. The evidence refers to GitHub Issue #89. | Remaining. Triage and fix or explicitly defer with re-test evidence before the final release. |
| OP-01 | Lab 7 smoke test | Public health, readiness, UI and unauthenticated-template checks passed; login was skipped because optional smoke credentials were not configured. | Remaining evidence gap. Add a safe authenticated post-deploy check using private handoff credentials or a controlled seeded account; never commit credentials. |
| OP-02 | Lab 7 deployment evidence | The deployed image tag/digest identifies the commit correctly, but the application `GIT_COMMIT_SHA` environment value was stale. | Remaining. Correct or remove the misleading display/variable and verify the candidate version by tag, image digest, Cloud Run revision, and CI run. |
| EV-01 | Lab 7 regression evidence | `TEST-21` fixture was updated to an injected date within the new seven-day window; the assertion purpose was unchanged. | Resolved at `f6c07fa`; preserve the regression evidence. |

## Scope controls

1. Contracts for every row above must be committed and reviewed before its first implementation commit.
2. Any addition, removal, or materially changed acceptance criterion requires a new change-record entry; this file is not rewritten to erase prior decisions.
3. All Sprint 2 rows are required for Sprint 2 completion. They may not be moved to Sprint 3 without an approved baseline revision.
4. The Sprint 3 status vocabulary is `planned`, `in progress`, `implemented`, `tested`, and `accepted`. At this checkpoint only the chosen workflow is expected to reach implementation and tested status.
5. The final traceability matrix must identify actual test files/measurements and execution results. A planned or unexecuted check is never recorded as passing.

## Issue-board setup checklist

- [ ] Create milestone **Delivery 2**, due 29 November 2026.
- [ ] Create labels: `delivery-2`, `part-A`, `part-B`, `part-C`, `part-D`, `part-E`, `docs`, `feature`, `test`, `deploy`, `evidence`.
- [ ] Create board columns: Backlog, Ready, In Progress, In Review, Done.
- [ ] Create and assign Delivery 2 Issues 2–14 from the approved issue plan; apply the milestone and relevant labels.
- [ ] Keep Issue 1 in **In Progress** until Kulchaya has reviewed this scope freeze.
