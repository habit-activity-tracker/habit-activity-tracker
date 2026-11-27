# Deliverable 3 — Scope Freeze and Open-Items Register

**Version:** 1.1  
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
| 1.1 | 27 November 2026 | Corrected D2 GAP identities/statuses; added feature, AC-partial and debt inventory; linked the authoritative endpoint list; aligned GAP-07 with Amendment 3. | Preserve D2 traceability and resolve review findings. |

---

## Baseline and source of truth

The Delivery 3 scope freeze starts from `main` commit `9af6280` (tag `v0.2.0`), the Delivery 2 release merge commit. D2 evidence/counts are cited at `9af6280`; `c5d3122` is a separate 24 November 2026 Part A E2E-fixture commit and is not an ancestor of the D2 release.

The three-sprint plan in `docs/sprints/plan.md` and SRS decisions AD-01 through AD-18 (including approved change CR-01) remain in force. This document adds Delivery 3 delivery identifiers and statuses without renumbering or deleting any baseline item.

---

## 1. Full requirement and feature status table

Statuses: **DONE** = implemented and tested with evidence (provisional until independent UAT and final release). **PARTIAL** = implemented but with a known gap (documented below). **CHANGED** = amended by an approved change record. **NOT DONE** = not implemented.

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
| FR-12 | System rejects records outside template range, future/outside goal period, >7 days ago, wrong timezone | F-05 | S1/CR-01 | **CHANGED** | CR-01 implementation in `records.test.ts`; `c5d3122` |
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
| BR-07 | Date boundary in APP_TIMEZONE (Asia/Bangkok) | F-05/F-08 | S1/CR-01 | **CHANGED** | CR-01 implementation in `records.test.ts`; `c5d3122` |
| BR-08 | Goal date rules (start ≤ end, etc.) | F-04 | S1 | **DONE** | `goals.test.ts`; `c5d3122` |
| BR-09 | Record date must be within goal period | F-05 | S1/CR-01 | **CHANGED** | CR-01 implementation in `records.test.ts`; `c5d3122` |
| BR-10 | Template unit is immutable; goal lifecycle is versioned | F-03/F-04 | S1–S2 | **DONE** | `templates.update.test.ts`; `goals.revision.test.ts`; `7f04dbd` |
| BR-11 | Participant data is private; no cross-role sharing; F-11 scope is schedules only (no notifications) | F-02/F-11 | S1–S3 | **PARTIAL** | Access tests pass; AC-S3-09 no-dispatch not yet automated (Issue 2) |

### Non-Functional Requirements

| ID | Requirement | Target | Status | Evidence / note |
|---|---|---|---|---|
| NFR-01 | p95 authenticated read ≤ 500 ms (100k records) | ≤ 500 ms p95 | **DONE** | `docs/evidence/d2-s2/performance-benchmark.md`: 187.46 ms p95; `5b6353e` |
| NFR-02 | Protected endpoints require valid session and correct role | 401/403 on all protected endpoints | **DONE** | `access-control.sprint2.test.ts`; `reminder-schedules.test.ts`; `7e8ca5b` |
| NFR-03 | Passwords not stored or logged in plaintext (bcrypt) | No plaintext credential in logs/DB | **PARTIAL** | bcrypt storage confirmed in `auth.test.ts`; log-plaintext inspection (AC-06/GAP-03) not yet evidenced — Issue 4 |
| NFR-04 | UTC persistence; calendar dates interpreted in APP_TIMEZONE | Timezone correct | **DONE** | `records.test.ts`; `c5d3122` |
| NFR-05 | Stable JSON error codes for all validation/ownership errors | Stable error codes | **PARTIAL** | Existing validator tests pass, but PD-03a still returns `500`; AC-02b/TEST-01.9 are required in Issue 2. |
| NFR-06 | API test statement coverage ≥ 90% of service/domain rules + all permission cases | ≥ 90% | **PARTIAL** | Lab 7 measured 83.05%; re-measurement pending after Issues 2 and 4 — Issue 5/GAP-05 |
| NFR-07 | Recovery: RPO ≤ 24 h, RTO ≤ 4 h; documented isolated restore | RPO ≤ 24 h; RTO ≤ 4 h | **PARTIAL** | Secret injection is in place; isolated restore evidence is pending — Issue 5/GAP-06 |

### Feature inventory and retained debt

| Feature | Scope | Status | Evidence / open item |
|---|---|---|---|
| F-01 | Authentication and session | **PARTIAL** | Core flow tested; AC-06/AC-07 checks and AC-02b remain open. |
| F-02 | Access control | **PARTIAL** | API access tests exist; AC-27 UI safe-denial evidence remains incomplete. |
| F-03 | Activity templates | **DONE** | API and UI tests recorded. |
| F-04 | Goals | **PARTIAL** | AC-43 route absence test is GAP-01. |
| F-05 | Daily records | **CHANGED** | CR-01 date/time behaviour applies. |
| F-06 | Progress calculation | **DONE** | Progress tests recorded. |
| F-07 | Goal/history UI | **PARTIAL** | Component evidence GAP-02; revision UI GAP-07. |
| F-08 | Shared validation and API error contract | **PARTIAL** | PD-03a / AC-02b is an open error-contract gap. |
| F-09 | Study dashboard UI | **PARTIAL** | Component evidence remains incomplete (GAP-02). |
| F-10 | Testable deployment and security baseline | **PARTIAL** | Coverage (GAP-05), restore (GAP-06), and deployment/security checks remain. |
| F-11 | Reminder schedules | **PARTIAL** | No-dispatch test GAP-08 remains. |
| Delivery | Docker, CI and GCP delivery baseline | **PARTIAL** | Delivery pipeline exists; OP-01/OP-02 and final deployment evidence remain. |

| AC/debt ID | Status | Retained action |
|---|---|---|
| AC-06 | **PARTIAL** | bcrypt assertion exists; inspect deployed logs for plaintext passwords (GAP-03). |
| AC-07 | **PARTIAL** | `HttpOnly`/`SameSite` checked; verify `Secure` and expiry (GAP-04). |
| AC-27 | **PARTIAL** | Obtain UI safe-denial/component evidence or mark INCOMPLETE (GAP-02). |
| SEC-01 | **OPEN** | Record security impact and remediation/defer decision in Issue 7 debt register. |
| OBS-01 | **OPEN** | Record observability impact and next action in Issue 7 debt register. |
| S3-Q01 | **OPEN** | CSRF/rate-limiting debt (SEC-01); record impact and remediation/defer decision in Issue 7. |
| S3-Q02 | **OPEN** | Error-logging debt (OBS-01); record observability impact and next action in Issue 7. |

### Sprint 2 delivery items

| Delivery ID | Description | Status | Evidence |
|---|---|---|---|
| S2-F04-R | Versioned goal revision (API + backend) | **PARTIAL** | API and tests done; Revise UI not built — GAP-07 decision: **build UI** (see §4) |
| S2-F06-S | Deterministic streak calculation | **PARTIAL** | D2 recorded partially tested; retain status pending final re-run. |
| S2-F07-S | History summary (progress, streak, records, revisions) | **PARTIAL** | D2 recorded partially tested; retain status pending final re-run. |
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
| GAP-01 | AC-43 | `PATCH` and `DELETE /api/goals/:id` must return `404 ROUTE_NOT_FOUND`; D2 recorded no automated test. Write meaningful assertions in Issue 2. | Kulchaya | 2 Dec | Issue 2 |
| GAP-02 | Traceability | AC-34, AC-38, AC-44, and AC-50 have no component-level automated test. Add or mark INCOMPLETE in final matrix. | Kulchaya | 5 Dec | Issue 5 |
| GAP-03 | NFR-03 / AC-06 | Log-plaintext inspection for passwords has not been executed. Inspect Cloud Run logs and record result. | Chayanit | 3 Dec | Issue 4 |
| GAP-04 | AC-07 | Cookie `Secure` flag and expiry have not been verified. Check Set-Cookie header on deployed URL and record. | Chayanit | 3 Dec | Issue 4 |
| GAP-05 | NFR-06 | API statement coverage is 83.05%; target is ≥ 90%. Re-measure after Issues 2 and 4 on a commit close to final. If still below, record honestly and state plan. | Kulchaya | 5 Dec | Issue 5 |
| GAP-06 | NFR-07 | Isolated restore exercise not done. Must use a separate Cloud SQL target; never overwrite production. Measure RTO and RPO. | Chayanit | 2 Dec (start), 5 Dec (close) | Issue 5 |
| GAP-07 | S2-F04-R | Revise goal UI not built in Delivery 2. **Decision: BUILD the UI** in Delivery 3 (see §4). | Chayanit | 3 Dec | Issue 4 |
| GAP-08 | S3-F11-R | AC-S3-09 (no-dispatch proof) has no automated test. TEST-S3-09 must be written and enabled. | Kulchaya | 2 Dec | Issue 2 |
| GAP-09 | Traceability (D2) | Rows FR-10, BR-04, BR-06, NFR-01 cite wrong/vague test files; BR-10/BR-11 have insufficient PASS evidence. Correct them in the final matrix. | Chayanit | 7 Dec | Issue 6 |
| PD-03a | Lab 7 / AC-02b | Invalid JSON to `POST /api/auth/login` returned `500 INTERNAL_ERROR`. Implement AC-02b and TEST-01.9 by RED/GREEN commits; Issue #89 closes on GREEN. | Kulchaya | 2 Dec | Issue 2 |
| OP-01 | Lab 7 | Smoke credentials not configured; authenticated post-deploy check was skipped. Add safe post-deploy smoke check using seeded account (never commit credentials). | Chayanit | 3 Dec | Issue 4 |
| OP-02 | Lab 7 | `GIT_COMMIT_SHA` env value was stale on deployed app. Correct the value via `github.sha` in deploy workflow. | Chayanit | 3 Dec | Issue 4 |

---

## 3. Full endpoint list (for Issue 3 access matrix)

The authoritative list is [endpoint-list.md](endpoint-list.md), derived from the route files at `v0.2.0` (`9af6280`). The reviewer must check that single list against the live router files; it contains the endpoint numbering, ownership rules and error-order notes used by Issue 3.

---

## 4. GAP-07 decision: build the Revise goal UI

**Decision:** Build the "Revise goal" page in Issue 4 (branch `feature/d3-revision-ui-ops`).

**Reason:** FR-15 requires a complete participant UI journey, the backend is already complete, and API-only revision would be a visible demonstration gap.

**Fallback:** If the UI is not merged into `d3-staging` by **3 Dec**, amend S2-F04-R to API-only (v1.2), mark GAP-07 as a disclosed limitation, and record the date and reason.

**Scope boundary:** The UI calls the real backend and sends only `target` and `end_date`; the server sets `effective_date`, which the UI displays only. It shows the current goal effect and revision history, never edits/deletes past revisions, rejects invalid input with inline messages, and relies on API ownership enforcement.

---

## 5. Scope controls and rules carried forward

1. Every contract amendment must be reviewed and merged to `d3-staging` before the first red commit of Issues 2 and 4.
2. No requirement or feature may be silently deleted. Items that are PARTIAL or NOT DONE must remain visible in the status table with a GAP ID.
3. Targets (NFR percentages, timing) are never raised after measurement to make a failing result look like a pass.
4. AC-S3-09 must remain enabled with meaningful assertions; it cannot be skipped to reach a green suite.
5. PD-03a requires a separate red commit followed by a green commit in Issue 2.

---

## 6. Issue-board setup checklist (for this issue)

- [x] Created `d3-staging` from the Issue 1 base commit before opening this PR
- [x] Created branch `docs/d3-scope-contracts` for this issue
- [ ] Reviewer (Kulchaya) reviews and approves this scope freeze
- [ ] Merge PR into `d3-staging`
- [ ] Create Delivery 3 milestone on GitHub (due 13 December 2026)
- [ ] Issues 2–10 already created (#127 is Issue 1); apply Delivery 3 milestone and labels
- [ ] Confirm independent UAT testers by 30 November 2026
