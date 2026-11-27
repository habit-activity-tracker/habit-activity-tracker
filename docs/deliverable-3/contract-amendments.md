# Delivery 3 — Contract Amendments

**Version:** 1.1  
**Date:** 27 November 2026 (Asia/Bangkok)  
**Author:** Chayanit Kuntanarumitkul (67070503408)  
**Reviewer:** Kulchaya Paipinij (67070503406)  
**Issue:** #127  
**Branch:** `docs/d3-scope-contracts` → `d3-staging`

These amendments must be merged to `d3-staging` with Kulchaya's review before the first red commit of Issues 2 and 4.

---

## Amendment 1 — TEST-S3-09: no-dispatch proof (AC-S3-09)

**Contract:** `docs/deliverable-2/contracts/sprint-3/S3-F11-R-reminder-schedules.md` at baseline commit `9af6280`. This baseline contract path is no longer present in the current worktree, so the amendment is its retained D3 successor.  
**Previous version:** v1.0 — TEST-S3-09 described the test but it was not written or enabled.  
**New version (D3 amendment v1.1):** TEST-S3-09 must be implemented and enabled in Issue 2. It is not optional and may not be skipped.

### What changes

| Item | Before (v1.0 state at D2) | After (D3 requirement) |
|---|---|---|
| TEST-S3-09 existence | Described in STS table; not implemented in test file | Must be a real, enabled test in `api/tests/api/reminder-schedules.test.ts` or a new file |
| Assertion depth | "Spy/mock every dispatch adapter" — no implementation | Must use a Jest spy or mock on any outbound adapter; assert zero calls on spy after POST/GET/compute operations |
| Skipped-test rule | No test, implicitly absent | `skipped = 0` for all required S3 tests; AC-S3-09 must be PASS |

### Reason

AC-S3-09 is a required baseline acceptance criterion establishing that reminder schedules do not dispatch notifications. Its absence means FR-16 and BR-11 (scope: "no notifications sent") cannot be claimed as fully tested. This amendment is non-negotiable; the test cannot be replaced by a code-review comment or a manual claim.

### Implementation instruction (for Issue 2 lead Kulchaya)

```typescript
// Minimum structure for TEST-S3-09 in api/tests/api/reminder-schedules.test.ts
it('TEST-S3-09: no notification dispatch occurs on create/list/compute', async () => {
  // Spy on any module that could send: nodemailer, fetch, axios, etc.
  const dispatchSpy = jest.spyOn(/* outbound module */, /* send method */).mockImplementation(() => Promise.resolve());
  // POST a valid schedule
  // GET the schedule list
  // Assert dispatchSpy was never called
  expect(dispatchSpy).not.toHaveBeenCalled();
  dispatchSpy.mockRestore();
});
```

If the codebase has no outbound adapter (which is expected — AD-15/AD-17), the test should confirm this explicitly by asserting that no dispatch function exists on the imported service, or use a module-level spy and assert zero calls. The assertion must be meaningful; a no-op test body does not satisfy AC-S3-09.

---

## Amendment 2 — PD-03a: malformed-JSON error contract (AC-02b)

**Contract:** `docs/sprints/sprint-1/F-01-auth.md`, plus the shared error table (F-08 / NFR-05) for the new code.  
**Previous version:** AC-02a requires `400 INVALID_LOGIN_REQUEST` when the login **email is malformed**. It is covered by TEST-01.8 and passes. No AC covers a request **body that is not valid JSON**, so the `500 INTERNAL_ERROR` found in the Lab 7 post-deploy check (PD-03a) had no requirement and no test.  
**New version (D3 amendment):** adds **AC-02b** and **TEST-01.9**. AC-02a and TEST-01.8 are unchanged.

### What changes

| Item | Before | After |
|---|---|---|
| `POST /api/auth/login` with a body that is not parseable JSON | `500 INTERNAL_ERROR` (PD-03a) | `400 INVALID_JSON` in the shared error envelope; no session is created |
| Requirement covering it | None (gap found after release) | AC-02b (new) |
| Automated test | None | TEST-01.9 (RED commit, then GREEN commit) |
| AC-02a / TEST-01.8 | Pass | Unchanged |
| Issue #89 | Reopened for Delivery 3 | Closed by the GREEN commit |

### New acceptance criterion and test

| ID | Observable outcome |
|---|---|
| **AC-02b** (new) | A login request whose body cannot be parsed as JSON returns `400` with `error.code = INVALID_JSON` and `details = {}`. No session cookie is set and the response contains no stack trace or internal message. Valid login, wrong password and unknown user behave exactly as before. |

| Test ID | AC | Level | Setup / action | Expected result |
|---|---|---|---|---|
| TEST-01.9 | AC-02b | API | `POST /api/auth/login` with `Content-Type: application/json` and a truncated JSON body | `400`; `INVALID_JSON`; empty details; no `Set-Cookie`; no stack trace |

The existing auth tests (TEST-01.x including TEST-01.8) must stay green.

### Error response target

```json
HTTP 400
{
  "error": {
    "code": "INVALID_JSON",
    "message": "The request body is not valid JSON.",
    "details": {}
  }
}
```

`INVALID_JSON` is a new code. It is added to `api/src/errors.ts` and to the shared error table **in the same commit as the fix**. A new code is used because parsing fails before route code runs, so a login-specific code is not available to a general handler.

### Scope note: protected routes

The fix is an app-level error handler, so other JSON routes also return `400` instead of `500` for malformed JSON. Protected routes must keep the AD-14 check order (401 → 403 → 404 → 400 → 409). Issue 2 must check whether the body parser runs before the session check; if so, either run the session check first or record the 400-before-401 ordering exception here. Only the login route is covered by TEST-01.9. The `access-control.sprint2` suite must stay green.

### Reason

A 500 on a client error (malformed request body) is a bug that leaks server internals and breaks client error handling. This must be fixed before the final release. The TDD requirement (red commit → green commit) applies because PD-03a was an identified defect.

### Implementation instruction (for Issue 2 lead Kulchaya)

1. Write TEST-01.9 in `api/tests/api/auth.test.ts` and commit it as **red**: `test: add failing test for PD-03a malformed-JSON login (AC-02b)`.
2. Add an app-level error handler for the body-parser `SyntaxError` that returns the `400 INVALID_JSON` envelope. Add the code to `errors.ts` in the same commit. Commit as **green**: `fix: return 400 INVALID_JSON for malformed JSON body (PD-03a, AC-02b, Closes #89)`.
3. Confirm the fix does not change valid login, wrong password, unknown user, or 401/403/404 results. If permission behaviour changes, tell Chayanit so Issue 3 is re-run.

---

## Amendment 3 — S2-F04-R: Revise goal UI (GAP-07 resolution)

**Contract:** `docs/deliverable-2/contracts/sprint-2/S2-F04-R-goal-revision.md` at baseline commit `9af6280`. This baseline contract path is no longer present in the current worktree, so the amendment is its retained D3 successor.  
**Previous version:** v1.0 — the contract has a “UI behavior” section (owner action, live-validation form and revision history). Only its API and tests (AC-S2-01 to AC-S2-06) were delivered in D2; the UI was not built (GAP-07).  
**New version (D3 amendment v1.1):** implements that UI behaviour and adds AC-S2-R01 to R06 with an STS. **There is no API change.**

### GAP-07 decision

**Decision:** BUILD the Revise Goal UI.

**Reason:** FR-15 requires a complete participant UI journey, the backend is already complete, and API-only revision would be a visible demonstration gap.

**Fallback:** If the UI is not merged into `d3-staging` by **3 Dec**, amend this contract to API-only (v1.2), mark GAP-07 as a disclosed limitation, and record the date and reason.

### Additional acceptance criteria (D3 scope, implemented in Issue 4)

| ID | Observable outcome |
|---|---|
| **AC-S2-R01** (new) | The authenticated owner sees “Revise goal”; target and end date are pre-filled and start date is read-only. |
| **AC-S2-R02** (new) | A valid revision sends only `target` and `end_date` to `POST /api/goals/:id/revisions`; on `201` the new values/version and revision persist after reload. |
| **AC-S2-R03** (new) | Empty, zero, negative or non-numeric target, or an end date before the start date, shows an inline validation/API error; no revision is created and a saving state is shown. |
| **AC-S2-R04** (new) | History is ascending by version and shows version, target, end date and display-only effective date. |
| **AC-S2-R05** (new) | Another participant sees a safe not-found state with no form/data; API returns `404 GOAL_NOT_FOUND`. A Program Manager receives `403 ROLE_FORBIDDEN`. |
| **AC-S2-R06** (new) | Daily records and history list are unchanged after revision; progress uses the new target (FR-11). |

### Software Test Specification (STS)

Level: **Playwright E2E**, using the existing `e2e/` setup; no component-test framework is added here.

| Test ID | AC | Setup / action | Expected result |
|---|---|---|---|
| TEST-S2-R01 | R01 | Alice opens version-1 goal | Action visible; values pre-filled; start date read-only |
| TEST-S2-R02 | R02 | Alice submits target 200 and an end date | Only target/end_date sent; 201; v2 persists after reload; history lists v1/v2 |
| TEST-S2-R03a | R03 | Alice submits target 0 | Inline error; version/history unchanged |
| TEST-S2-R03b | R03 | Alice submits an end date before start | Inline error; version/history unchanged |
| TEST-S2-R04 | R04 | Goal has two revisions | Ascending history; effective date has no input |
| TEST-S2-R05 | R05 | Bob opens Alice’s goal URL | Safe not-found; no form or goal data |
| TEST-S2-R06 | R06 | Alice revises a goal with two records | Records identical; percentage uses new target |

Existing API coverage is reused: TEST-S2-05a (manager 403), TEST-S2-05b (other participant 404), TEST-S2-02b / TEST-S2-03 (validation), and TEST-S2-04 (records unchanged). No new API RED is required for those cases.

### Scope boundary

- The UI calls the real backend only; no client-side state management workarounds.
- The form sends only `target` and `end_date`; the server sets `effective_date`, which is display-only.
- Existing `daily_records` rows are never modified by a revision.
- Past revisions cannot be edited or deleted.
- A Program Manager has no access to participant goals or revisions.

### Definition of Done

- Every AC-S2-R01 to R06 has an executed result.
- RED/GREEN commit hashes are recorded for R01–R04 and R06.
- Screenshots show role, expected/actual and version; the existing suite stays green.

### Implementation instruction (for Issue 4 lead Chayanit)

- Write RED E2E specs for R01–R04 and R06 before building. R05 reuses API tests and adds only the E2E check.
- Add GREEN commits as each acceptance criterion is satisfied.
- If any behaviour differs from the written ACs, update this document with the reason before the PR review.

---

## Amendment summary table

| Amendment | Contract affected | AC/Test affected | Lead (Issue) | Status |
|---|---|---|---|---|
| 1 — TEST-S3-09 no-dispatch | S3-F11-R v1.0 → v1.1 | AC-S3-09; TEST-S3-09 | Kulchaya (Issue 2) | Required before Issue 2 first red commit |
| 2 — PD-03a malformed-JSON | F-01 auth + shared error table | AC-02b (new); TEST-01.9; `INVALID_JSON` | Kulchaya (Issue 2) | Required before Issue 2 first red commit |
| 3 — S2-F04-R Revise UI | S2-F04-R v1.0 → v1.1 | AC-S2-R01 to R06; TEST-S2-R01 to R06 | Chayanit (Issue 4) | Required before Issue 4 first red commit |
