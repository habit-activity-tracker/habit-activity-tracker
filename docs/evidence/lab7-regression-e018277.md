# Lab 7 Regression Evidence — `lab7-staging`

**Tested revision:** `f6c07fa` (`test: stabilize TEST-21 fixture for AC-12a`)  
**Pre-change reference:** `001058bd`  
**Date:** 2026-11-22 (Asia/Bangkok)  
**Purpose:** Verify that the RED/GREEN change preserves existing tests and that no old tests were removed, skipped, or disabled.

The API baseline at `001058bd` was 47 tests. The current API suite has 56 tests: the 9 additions are `TEST-12.1a` through `TEST-12.1i`. Cases `12.1g` and `12.1h` are each one Jest test with multiple assertions/requests; `12.1i` is the ninth new test.

## Test-change review

Comparison:

```text
git diff 001058bd..f6c07fa -- api/tests
```

Result: `api/tests/api/records.test.ts` contains 124 added lines; `api/tests/api/templates.update.test.ts` contains 8 added and 3 changed/deleted fixture lines. No test declaration was deleted. The diff contains no `skip`, `only`, `describe.skip`, `it.skip`, `test.skip`, or disabled-test marker.

## Full-suite execution — successful rerun

Command:

```text
npm test
```

### Unit suite

```text
Test Suites: 4 passed, 4 total
Tests:       9 passed, 9 total
Snapshots:   0 total
```

### API/database suite

```text
Test Suites: 9 passed, 9 total
Tests:       56 passed, 56 total
Failed:      0
Skipped:     0
Snapshots:   0 total
```

| Suite | Command | Revision | Passed | Failed | Skipped | Machine | Time |
|---|---|---|---:|---:|---:|---|---|
| Unit | `npm run test:unit` | `f6c07fa` | 9 | 0 | 0 | Kulchaya | 2026-11-22 23:54–23:55 +07 |
| API | `npm test` | `f6c07fa` | 56 | 0 | 0 | Kulchaya | 2026-11-22 23:54–23:55 +07 |

The successful rerun used the repository PostgreSQL service on `localhost:5433`. The full suite result was:

```text
Unit: 4 suites, 9 passed, 0 failed, 0 skipped
API: 9 suites, 56 passed, 0 failed, 0 skipped
Total: 65 passed, 0 failed, 0 skipped
```

The existing `TEST-21 / AC-21` fixture was updated to use a fixed injected `Asia/Bangkok` test clock (`2026-11-10`) and record date `2026-11-04` (6 days old). The old `2026-11-01` date was outside the new 7-day window. The test, assertion, and behavior under test were retained; no test was deleted, skipped, or weakened.

## Legitimate fixture update

| Test ID | Old input / expected | New input / expected | Reason | Contract version |
|---|---|---|---|---|
| `TEST-21 / AC-21` (`api/tests/api/templates.update.test.ts`) | Existing record with `activity_date: 2026-11-01`; record remains readable after template range update | Existing record dated `2026-11-04` with injected `today = 2026-11-10`; same assertion | The old date is more than 7 days before the test clock, so record creation is rejected under `AC-12a`. The new date is 6 days old and remains safely inside the window. The test purpose is unchanged. | v1.1 (#75) |

Assertions preserved. No test deleted, skipped, weakened, or disabled.

## Activity-date audit

Command:

```text
rg -n "activity_date" api/tests
```

Audit summary:

- `templates.update.test.ts:51`: TEST-21 uses injected `today = 2026-11-10` and record date `2026-11-04`; this was the only record-creation fixture requiring change.
- `records.test.ts`: F-05 cases use injected `today`, `dateMinus7`, `dateMinus8`, and explicit boundary fixtures.
- `progress.test.ts:22,26`: direct database inserts for progress-read calculations; the creation cutoff does not apply.
- `record.validator.test.ts:5,9,10`: date syntax/format validation only.

## Remaining evidence

- [ ] Contract follow-up PR #81 adding `TEST-12.1i` is reviewed and merged
- [ ] Independent rerun on Chayanit's machine
- [ ] CI `test-and-docker` result from the staging PR

## Decision

**Regression status: PASS.** Unit and API/database suites pass with zero failures and zero skips. CI and the independent rerun on Chayanit's machine remain separate evidence items.

