# Delivery 3 — Issue 2 test and bug-fix evidence

**Branch:** `feature/d3-tests-fixes-v2`  
**Base:** `d3-staging` at `cf8ce75`  
**Date:** 27 November 2026 (Asia/Bangkok)  
**Lead:** Kulchaya  
**Reviewer:** Chayanit (approved after independent retest)

## Scope

- Add and enable `TEST-S3-09 / AC-S3-09` to prove that reminder create/list/compute performs no notification dispatch.
- Add meaningful `AC-43` assertions that unsupported goal `PATCH` and `DELETE` routes return `404 ROUTE_NOT_FOUND`.
- Implement the amended `AC-02b / TEST-01.9` contract: malformed JSON returns `400 INVALID_JSON`, uses the shared error envelope, sets no session cookie, and does not expose parser details.

## TDD trace

| Stage | Commit | Evidence |
|---|---|---|
| RED | `ca4aad5` | New tests were added. Before the fix, `TEST-01.9` failed because malformed JSON returned `500 INTERNAL_ERROR`; the other new regression assertions passed. |
| GREEN | `5ba5905` | Added `INVALID_JSON` and converted Express JSON parse failures to the documented `400` error response. |

## Verification

Commands were run with the repository PostgreSQL service on port 5433:

```text
npm run test:unit
Test Suites: 6 passed, 6 total
Tests:       18 passed, 18 total

npm run test:api
Test Suites: 14 passed, 14 total
Tests:       82 passed, 82 total

npm run test:e2e
3 passed

npm run build
API and Web build passed
```

No tests were skipped, deleted, or weakened. The API total increased by three tests: `TEST-01.9`, `TEST-S3-09`, and `TEST-AC-43`.

## Partner retest and review

| Item | Result |
|---|---|
| Reviewer | Chayanit |
| Commit tested | `a403049ea53d4b5a29d74dfd1401a40b8358f5c8` |
| Unit tests | 6 suites, 18 passed, 0 failed, 0 skipped |
| API tests | 14 suites, 82 passed, 0 failed, 0 skipped |
| E2E tests | 3 passed, 0 failed, 0 skipped |
| Build | API and Web passed |
| Review | Approved after independent retest |
| PR | #139 |

Chayanit verified the RED → GREEN → evidence chain, the three Issue 2 test/fix areas, and the reported results. No additional defect was found.

## Remaining evidence

- Manual deployed F-11 UI acceptance evidence is tracked separately; this document does not claim browser acceptance.
- Issue #89 should be closed only after the GREEN change is reviewed and merged.
