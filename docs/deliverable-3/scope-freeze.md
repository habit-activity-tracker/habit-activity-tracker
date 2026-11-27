# Deliverable 3 — Scope Freeze and Open-Items Register

**Version:** 1.0  
**Date:** 27 November 2026 (Asia/Bangkok)  
**Lead:** Chayanit Kuntanarumitkul (67070503408)  
**Reviewer:** Kulchaya Paipinij (67070503406)  
**Issue:** #127 — [Delivery 3] Issue 1 Scope freeze and contract amendments  
**Branch:** `docs/d3-scope-contracts` → `d3-staging`

---

## Revision history

| Version | Date | Change | Reason |
|---|---|---|---|
| 1.0 | 27 November 2026 | Initial Delivery 3 scope freeze: full FR/BR/NFR status table, open-items register, GAP-07 decision (build Revise UI), endpoint list, and amended contracts for TEST-S3-09, PD-03a, and S2-F04-R. | Establish the final baseline before any Issue 2–10 implementation work. |

---

## Baseline and source of truth

The Delivery 3 scope freeze starts from `main` commit `9af6280` (tag `v0.2.0`). This was the Delivery 2 release merge commit verified on 25 November 2026.

The three-sprint plan in `docs/sprints/plan.md` and SRS decisions AD-01 through AD-18 (including approved change CR-01) remain in force. This document adds Delivery 3 delivery identifiers and statuses without renumbering or deleting any baseline item.

---

## 1. Full requirement and feature status table

Statuses: **DONE** = implemented, tested, and accepted with evidence. **PARTIAL** = implemented but with a known gap (documented below). **CHANGED** = amended by an approved change record. **NOT DONE** = not implemented.

### Functional Requirements

| ID | Requirement summary | Feature | Sprint | Status | Evidence / note |
|---|---|---|---|---|---|
| FR-01 | Authenticate registered user, establish session | F-01 | S1 | **DONE** | `auth.test.ts`; Part A rerun `c5d3122` |
| FR-02 | Identify current user/role; support logout | F-01 | S1 | **DONE** | `auth.test.ts` `/me`, logout; `c5d3122` |
| FR-03 | Program Manager creates activity template | F-03 | S1 | **DONE** | `templates.create.test.ts`; `c5d3122` |
| FR-04 | Authenticated user lists active templates; unit is read-only | F-03 | S1 | **DONE** | `templates.list.test.ts`; `c5d3122` |
| FR-05 | Program Manager updates permitted template fields | F-03 | S1 | **DONE** | `templates.update.test.ts`; `c5d3122` |
| FR-06 | Participant creates goal (target, start/end date) | F-04 | S1 | **DONE** | `goals.test.ts`; `c5d3122` |
| FR-07 | System rejects invalid goal target/dates | F-04 | S1 | **DONE** | `goal.validator.test.ts`; `goals.test.ts`; `c5d3122` |
| FR-08 | Participant lists/retrieves only own goals | F-02/F-04/F-07 | S1–S2 | **DONE** | `access-control.sprint2.test.ts`; `7f04dbd` |
| FR-09 | Participant records a daily activity value | F-05 | S1 | **DONE** | `records.test.ts` 19 passed; `c5d3122` |
| FR-10 | System enforces one entry per goal per calendar day | F-05 | S1 | **DONE** | `records.test.ts` duplicate test; `c5d3122` |
| FR-11 | System calculates progress (total/target×100, 1dp, capped 100) | F-06 | S1–S2 | **DONE** | `progress.test.ts`; `sprint2.history.test.ts`; `6da30d5` |
| FR-12 | System rejects records outside template range, future/outside goal period, >7 days ago, wrong timezone | F-05 | S1/CR-01 | **DONE** | `records.test.ts` 19 passed; CR-01 implemented; `c5d3122` |
| FR-13 | Two goals on same template keep separate records and progress | F-05/F-07 | S1 | **DONE** | `records.test.ts`; `c5d3122` |
| FR-14 | Participant history/goals/records are private; managers cannot access by role | F-02/F-07 | S1–S3 | **DONE** | `access-control.sprint2.test.ts`; `reminder-schedules.test.ts`; `7e8ca5b` |
| FR-15 | UI presents goals, entry forms, history, and progress with shared states | F-07 | S1–S2 | **PARTIAL** | E2E 3/3 passed; AC-34/38/44/50 lack component-level automated tests (GAP-02) |
| FR-16 | Participant creates/lists up to 3 reminder schedules per active goal; strict-future next occurrence computed; no notifications sent | F-11 | S3 | **PARTIAL** | `reminder-schedules.test.ts` 6 passed; AC-S3-09 (no-dispatch proof) not yet written (Issue 2) |

### Business Rules

| ID | Rule summary | Feature | Sprint | Status | Evidence / note |
|---|---|---|---|---|---|
| BR-01 | Period-total target | F-06 | S1 | **DONE** | `progress.test.ts`; `c5d3122` |
| BR-02 | Progress = total/target×100 | F-06 | S1 | **DONE** | `progress.test.ts`; `c5d3122` |
| BR-03 | Half-up rounding to 1 dp, capped 100 | F-06 | S1 | **DONE** | `progress.test.ts`; `c5d3122` |
| BR-04 | Unique (goal_id, activity_date) | F-05 | S1 | **DONE** | `records.test.ts`; `c5d3122` |
| BR-05 | Same-template goals are independent | F-05/F-07 | S1 | **DONE** | `records.test.ts`; `c5d3122` |
| BR-06 | Inclusive value range (min ≤ value ≤ max) | F-05 | S1 | **DONE** | `records.test.ts`; `c5d3122` |
| BR-07 | Date boundary in APP_TIMEZONE (Asia/Bangkok) | F-05/F-08 | S1/CR-01 | **DONE** | `records.test.ts`; `c5d3122` |
| BR-08 | Goal date rules (start ≤ end, etc.) | F-04 | S1 | **DONE** | `goals.test.ts`; `c5d3122` |
| BR-09 | Record date must be within goal period | F-05 | S1/CR-01 | **DONE** | `records.test.ts`; `c5d3122` |
| BR-10 | Template unit is immutable; goal lifecycle is versioned | F-03/F-04 | S1–S2 | **DONE** | `templates.update.test.ts`; `goals.revision.test.ts`; `7f04dbd` |
| BR-11 | Participant data is private; no cross-role sharing; F-11 scope is schedules only (no notifications) | F-02/F-11 | S1–S3 | **PARTIAL** | Access tests pass; AC-S3-09 no-dispatch not yet automated (Issue 2) |

### Non-Functional Requirements

| ID | Requirement | Target | Status | Evidence / note |
|---|---|---|---|---|
| NFR-01 | p95 authenticated read ≤ 500 ms (100k records) | ≤ 500 ms p95 | **DONE** | `docs/evidence/d2-s2/performance-benchmark.md`: 187.46 ms p95; `5b6353e` |
| NFR-02 | Protected endpoints require valid session and correct role | 401/403 on all protected endpoints | **DONE** | `access-control.sprint2.test.ts`; `reminder-schedules.test.ts`; `7e8ca5b` |
| NFR-03 | Passwords not stored or logged in plaintext (bcrypt) | No plaintext credential in logs/DB | **PARTIAL** | bcrypt storage confirmed in `auth.test.ts`; log-plaintext inspection (AC-06/GAP-03) not yet evidenced — Issue 4 |
| NFR-04 | UTC persistence; calendar dates interpreted in APP_TIMEZONE | Timezone correct | **DONE** | `records.test.ts`; `c5d3122` |
| NFR-05 | Stable JSON error codes for all validation/ownership errors | Stable error codes | **DONE** | Validator tests + `reminder-schedules.test.ts`; `7e8ca5b` |
| NFR-06 | API test statement coverage ≥ 90% of service/domain rules + all permission cases | ≥ 90% | **PARTIAL** | Lab 7 measured 83.05%; re-measurement pending after Issues 2 and 4 — Issue 5/GAP-01 |
| NFR-07 | Recovery: RPO ≤ 24 h, RTO ≤ 4 h; documented isolated restore | RPO ≤ 24 h; RTO ≤ 4 h | **NOT DONE** | Restore exercise not yet performed — Issue 5/GAP-05 |

### Sprint 2 delivery items

| Delivery ID | Description | Status | Evidence |
|---|---|---|---|
| S2-F04-R | Versioned goal revision (API + backend) | **PARTIAL** | API and tests done; Revise UI not built — GAP-07 decision: **build UI** (see §4) |
| S2-F06-S | Deterministic streak calculation | **DONE** | `sprint2.history.test.ts`; `6da30d5` |
| S2-F07-S | History summary (progress, streak, records, revisions) | **DONE** | `sprint2.history.test.ts`; `6da30d5` |
| S2-F10-P | Performance benchmark, 100k seed | **DONE** | `docs/evidence/d2-s2/performance-benchmark.md`; `5b6353e` |

### Sprint 3 delivery items

| Delivery ID | Description | Status | Evidence |
|---|---|---|---|
| S3-F11-R | Reminder schedules: create/list, next-occurrence computed | **PARTIAL** | 6/9 ACs evidenced; AC-S3-09 no-dispatch proof missing (Issue 2) |
| S3-F10-O | Operational readiness: secret management, isolated restore | **NOT DONE** | Evidence not yet produced — Issue 5 and Issue 7 |
| S3-F10-Q | Verification hardening: coverage ≥ 90%, full permission matrix | **NOT DONE** | Coverage 83.05%; permission matrix incomplete — Issues 2 and 5 |

---

## 2. Open-items register

| ID | Source | Description | Owner | Due | Blocking issue(s) |
|---|---|---|---|---|---|
| GAP-01 | NFR-06 | API statement coverage is 83.05%; target is ≥ 90%. Re-measure after Issues 2 and 4 on a commit close to final. If still below, record honestly and state plan. | Kulchaya | 5 Dec | Issue 5 |
| GAP-02 | Traceability | AC-34, AC-38, AC-44, and AC-50 have no component-level automated test. Add or mark INCOMPLETE in final matrix. | Kulchaya | 5 Dec | Issue 5 |
| GAP-03 | NFR-03 / AC-06 | Log-plaintext inspection for passwords has not been executed. Inspect Cloud Run logs and record result. | Chayanit | 3 Dec | Issue 4 |
| GAP-04 | AC-07 | Cookie `Secure` flag and expiry have not been verified. Check Set-Cookie header on deployed URL and record. | Chayanit | 3 Dec | Issue 4 |
| GAP-05 | NFR-07 | Isolated restore exercise not done. Must use a separate Cloud SQL target; never overwrite production. Measure RTO and RPO. | Chayanit | 2 Dec (start), 5 Dec (close) | Issue 5 |
| GAP-06 | Traceability (D2) | Rows FR-10, BR-04, BR-06, NFR-01 cite wrong or vague test file; BR-10, BR-11 marked PASS with insufficient evidence. Must be corrected in final matrix. | Chayanit | 7 Dec | Issue 6 |
| GAP-07 | S2-F04-R | Revise goal UI not built in Delivery 2. **Decision: BUILD the UI** in Delivery 3 (see §4). | Chayanit | 3 Dec | Issue 4 |
| GAP-08 | S3-F11-R | AC-S3-09 (no-dispatch proof) has no automated test. TEST-S3-09 must be written and enabled. | Kulchaya | 2 Dec | Issue 2 |
| PD-03a | Lab 7 | Invalid JSON to `POST /api/auth/login` returned `500 INTERNAL_ERROR`. Fix and add red/green test. Issue #89 must be closed. | Kulchaya | 2 Dec | Issue 2 |
| OP-01 | Lab 7 | Smoke credentials not configured; authenticated post-deploy check was skipped. Add safe post-deploy smoke check using seeded account (never commit credentials). | Chayanit | 3 Dec | Issue 4 |
| OP-02 | Lab 7 | `GIT_COMMIT_SHA` env value was stale on deployed app. Correct the value via `github.sha` in deploy workflow. | Chayanit | 3 Dec | Issue 4 |

---

## 3. Full endpoint list (for Issue 3 access matrix)

This list is derived from the actual route files at `v0.2.0` (`9af6280`). The reviewer must check this list against the live router files.

| # | Method | Path | Auth required | Allowed roles | Record ownership |
|---|---|---|---|---|---|
| 1 | GET | `/api/health` | No | Any | None |
| 2 | GET | `/api/ready` | No | Any | None |
| 3 | POST | `/api/auth/login` | No | Any | None |
| 4 | GET | `/api/auth/me` | Yes (session) | participant, program_manager | None |
| 5 | POST | `/api/auth/logout` | Yes (session) | participant, program_manager | None |
| 6 | GET | `/api/me` | Yes (session) | participant, program_manager | None |
| 7 | POST | `/api/activity-templates` | Yes | program_manager only | None |
| 8 | GET | `/api/activity-templates` | Yes | participant (active only), program_manager (all) | None |
| 9 | PATCH | `/api/activity-templates/:id` | Yes | program_manager only | None |
| 10 | POST | `/api/templates` | Yes | program_manager only | (alias for #7) |
| 11 | GET | `/api/templates` | Yes | participant (active only), program_manager (all) | (alias for #8) |
| 12 | PATCH | `/api/templates/:id` | Yes | program_manager only | (alias for #9) |
| 13 | POST | `/api/goals` | Yes | participant only | None — creates owned goal |
| 14 | GET | `/api/goals` | Yes | participant only | Returns only the caller's goals |
| 15 | GET | `/api/goals/:id` | Yes | participant only | 404 if another participant's goal |
| 16 | GET | `/api/goals/:id/summary` | Yes | participant only | 404 if another participant's goal |
| 17 | POST | `/api/goals/:id/revisions` | Yes | participant only | 404 if another participant's goal |
| 18 | GET | `/api/goals/:id/revisions` | Yes | participant only | 404 if another participant's goal |
| 19 | POST | `/api/goals/:id/reminder-schedules` | Yes | participant only | 404 if another participant's goal |
| 20 | GET | `/api/goals/:id/reminder-schedules` | Yes | participant only | 404 if another participant's goal |
| 21 | POST | `/api/goals/:id/records` | Yes | participant only | 404 if another participant's goal |
| 22 | GET | `/api/goals/:id/records` | Yes | participant only | 404 if another participant's goal |
| 23 | GET | `/api/goals/:id/progress` | Yes | participant only | 404 if another participant's goal |

**Access rule for all goal sub-resources (endpoints 15–23):** `requireOwnedGoal` middleware verifies `goals.participant_id = authenticated_user.id`. An unauthenticated request returns 401, a program_manager returns 403, and another participant's goal returns 404 (no existence leak).

**Note on `/api/templates` alias:** endpoints 10–12 are identical to 7–9 (same router mounted at both paths). Both paths appear in the access matrix.

---

## 4. GAP-07 decision: build the Revise goal UI

**Decision:** Build the "Revise goal" page in Issue 4 (branch `feature/d3-revision-ui-ops`).

**Reason:**
- FR-15 requires the UI to present goals with shared states.
- The S2-F04-R contract (AC-S2-01 to AC-S2-06) describes the full workflow including UI confirmation of a saved revision. Amending to API-only would remove an acceptance criterion that has already been graded context.
- A participant-facing revision workflow without a UI leaves a substantial usability gap in the final demonstrated product (Part A).
- The backend is already implemented; the remaining work is the frontend form, revision-history display, and validation messages.

**Scope boundary:** The UI must call the real backend, show the effect on the current goal fields, and display the revision history. It must not allow editing or deleting a past revision. Invalid input must be rejected with useful inline messages. Cross-owner access must be blocked at the API, not just by hiding buttons.

---

## 5. Scope controls and rules carried forward

1. Every contract amendment must be reviewed and merged to `d3-staging` before the first red commit of Issues 2 and 4.
2. No requirement or feature may be silently deleted. Items that are PARTIAL or NOT DONE must remain visible in the status table with a GAP ID.
3. Targets (NFR percentages, timing) are never raised after measurement to make a failing result look like a pass.
4. AC-S3-09 must remain enabled with meaningful assertions; it cannot be skipped to reach a green suite.
5. PD-03a requires a separate red commit followed by a green commit in Issue 2.

---

## 6. Issue-board setup checklist (for this issue)

- [x] Created branch `docs/d3-scope-contracts` from `main` (`9af6280`)
- [ ] Reviewer (Kulchaya) reviews and approves this scope freeze
- [ ] Merge PR into `d3-staging`
- [ ] Create `d3-staging` from `main` / `9af6280` if not already done
- [ ] Create Delivery 3 milestone on GitHub (due 13 December 2026)
- [ ] Issues 2–10 already created (#127 is Issue 1); apply Delivery 3 milestone and labels
- [ ] Confirm independent UAT testers by 30 November 2026
