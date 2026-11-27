# Delivery 3 — Contract Amendments

**Version:** 1.0  
**Date:** 27 November 2026 (Asia/Bangkok)  
**Author:** Chayanit Kuntanarumitkul (67070503408)  
**Reviewer:** Kulchaya Paipinij (67070503406)  
**Issue:** #127  
**Branch:** `docs/d3-scope-contracts` → `d3-staging`

These amendments must be merged to `d3-staging` with Kulchaya's review before the first red commit of Issues 2 and 4.

---

## Amendment 1 — TEST-S3-09: no-dispatch proof (AC-S3-09)

**Contract:** `docs/deliverable-2/contracts/sprint-3/S3-F11-R-reminder-schedules.md`  
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

## Amendment 2 — PD-03a: malformed-JSON error contract (AC-02a)

**Contract:** Implied by the existing auth contract in `docs/sprints/sprint-1/F-01-auth.md` and Lab 7 post-deploy finding.  
**Previous state:** `POST /api/auth/login` with a malformed (non-parseable) JSON body returned `500 INTERNAL_ERROR` (found in Lab 7 post-deploy check PD-03a). AC-02a was noted as having no automated test.  
**New state (D3 amendment):** The correct response is `400` with a stable error code. AC-02a is now a required test in Issue 2.

### What changes

| Item | Before | After |
|---|---|---|
| `POST /api/auth/login` with malformed JSON body | 500 INTERNAL_ERROR (bug — PD-03a) | 400 with an appropriate error code (e.g., `INVALID_CREDENTIALS` or a JSON-parse error code) |
| AC-02a test | No automated test | TEST-02a must be written, failing (red commit), then fixed (green commit) |
| Issue #89 | Open | Closed after the green commit in Issue 2 |

### Error response target

```json
HTTP 400
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "..."
  }
}
```

The exact code must match the stable error vocabulary in `api/src/errors.ts`. If a new code is added, it must be added in the same commit as the fix.

### Reason

A 500 on a client error (malformed request body) is a bug that leaks server internals and breaks client error handling. This must be fixed before the final release. The TDD requirement (red commit → green commit) applies because PD-03a was an identified defect.

### Implementation instruction (for Issue 2 lead Kulchaya)

1. Write a failing test for the malformed-JSON case in `api/tests/api/auth.test.ts`. Commit as **red** with message: `test: add failing test for PD-03a malformed-JSON login (AC-02a)`.
2. Add an error handler or middleware that catches `SyntaxError` from `express.json()` and returns 400 with a stable code. Commit as **green** with message: `fix: return 400 for malformed-JSON login body (PD-03a, AC-02a, Closes #89)`.
3. The fix must not change the behaviour of valid login, invalid credentials, or unknown-user cases.

---

## Amendment 3 — S2-F04-R: Revise goal UI (GAP-07 resolution)

**Contract:** `docs/deliverable-2/contracts/sprint-2/S2-F04-R-goal-revision.md`  
**Previous version:** v1.0 — the contract defines API-level acceptance criteria (AC-S2-01 to AC-S2-06). The UI was not mentioned as a D2 deliverable.  
**New version (D3 amendment v1.1):** The Revise Goal UI is added to the S2-F04-R scope for Delivery 3. The backend is already complete; this amendment adds the UI acceptance criteria.

### GAP-07 decision

**Decision:** BUILD the Revise Goal UI.

**Reason:** See `docs/deliverable-3/scope-freeze.md §4`. The UI is required for Part A demonstration and for FR-15. API-only amendment would leave a visible gap in the final assessed product.

### Additional acceptance criteria (D3 scope, implemented in Issue 4)

| ID | Observable outcome |
|---|---|
| **AC-S2-R01** (new) | The Revise Goal form is accessible to the authenticated owner from the goal detail page. It pre-fills the current target and end date. |
| **AC-S2-R02** (new) | Submitting a valid revision calls `POST /api/goals/:id/revisions`; on success the goal detail page shows updated target/end date and the new revision appears in the revision history section. |
| **AC-S2-R03** (new) | Submitting an invalid revision (e.g. end date before start date, non-positive target, effective date before goal start) shows an inline validation error; no revision row is created. |
| **AC-S2-R04** (new) | The goal detail page shows a revision history section listing all past revisions (version number, target, end date, effective date). |
| **AC-S2-R05** (new) | A participant cannot revise another participant's goal through the UI; the backend enforces the ownership check (404) even if the form URL is guessed. |
| **AC-S2-R06** (new) | After a revision, existing daily records are unchanged (the daily record list still shows pre-revision entries). |

### Scope boundary (unchanged from D2)

- The UI calls the real backend only; no client-side state management workarounds.
- Revisions are created with an explicit `effective_date`; the UI must expose this field.
- Existing `daily_records` rows are never modified by a revision.
- A manager must not see the revision form or revision history for a participant's goal.

### Implementation instruction (for Issue 4 lead Chayanit)

- Write RED tests for AC-S2-R01 through AC-S2-R06 before building the UI components.
- GREEN commits follow after each acceptance criterion is satisfied.
- If any behaviour differs from the written ACs, update this document with the reason before the PR review.

---

## Amendment summary table

| Amendment | Contract affected | AC/Test affected | Lead (Issue) | Status |
|---|---|---|---|---|
| 1 — TEST-S3-09 no-dispatch | S3-F11-R v1.0 → v1.1 | AC-S3-09; TEST-S3-09 | Kulchaya (Issue 2) | Required before Issue 2 first red commit |
| 2 — PD-03a malformed-JSON | F-01-auth implied | AC-02a; TEST-02a | Kulchaya (Issue 2) | Required before Issue 2 first red commit |
| 3 — S2-F04-R Revise UI | S2-F04-R v1.0 → v1.1 | AC-S2-R01 to R06 | Chayanit (Issue 4) | Required before Issue 4 first red commit |
