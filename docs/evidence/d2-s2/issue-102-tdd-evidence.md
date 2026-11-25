# Issue #102 — Sprint 2 group A TDD evidence

This record covers S2-F04-R and S2-F10-P. It distinguishes executed local evidence from the GitHub review and merge records.

## S2-F04-R — Goal revision and versioned lifecycle

| Stage | Commit | Executed evidence | Outcome |
|---|---|---|---|
| RED | `680c337` | Validator assertion failed (`expected false, received true`); revision API assertion failed (`expected 201, got 404`). | Expected failures from TEST-S2-01 to TEST-S2-06. |
| GREEN | `a90197a` | `npm run test:unit`: 14 passed / 5 suites. `npm run test:api -- goals.revision.test.ts`: 8 passed. | AC-S2-01 to AC-S2-06 passed. |
| Review / merge | PR #115, merge `7f04dbd` | Partner approved the RED/GREEN progression, migration 006, immutability, AD-18 and ownership checks. | Merged into `d2-staging` on 24 November 2026. |

## S2-F10-P — Performance evidence and deterministic 100k seed

| Stage | Commit | Executed evidence | Outcome |
|---|---|---|---|
| RED | `d03aa7b` | `npm run test:api -- benchmark.test.ts`: 1 failed, 2 passed. `TEST-S2-15b` asserted 20 benchmark rows after a rerun and received 40. | Confirmed the real duplicate-fixture defect by assertion. |
| GREEN | `5b6353e` | The seed deletes only prior goals owned by `bench_user@example.com` using the dedicated benchmark template; FK cascade removes their records. `npm run test:api -- benchmark.test.ts`: 3 passed. | Reruns are deterministic and do not alter ordinary fixtures. |
| Performance | `5b6353e` | Local Docker Compose PostgreSQL 16: `npm run benchmark:seed` completed 100,000 seed rows in 13.78 s; total `daily_records` = 100,002. `npm run benchmark:run`: 100 warm-ups plus 1,000 authenticated reads. | p50 79.79 ms; p90 148.12 ms; p95 **187.46 ms**; p99 461.14 ms. AC-S2-15 to AC-S2-17 and NFR-01 passed. |

## Review handoff

PR #116 contains the S2-F10-P implementation and this evidence. Reviewer should verify the commits above, the focused API result (3 passed), and the local benchmark evidence before approving and merging.

GitHub review text and any required GitHub/board screenshots are external artifacts; capture them at review and merge time rather than claiming an uncaptured image exists in the repository.
