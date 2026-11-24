# Sprint 2 completion table

This table records executed implementation evidence. A row is marked released only after its implementation PR has received partner review and merged into `d2-staging`.

| Delivery ID | Acceptance criteria | Implementation / branch | Executed verification | Result | Release |
|---|---|---|---|---|---|
| S2-F04-R | AC-S2-01 to AC-S2-06 | RED `680c337`; GREEN `a90197a`; merged by PR #115 at `7f04dbd` | `npm run test:unit` (14 passed / 5 suites); `npm run test:api -- goals.revision.test.ts` (8 passed) | PASS: versioned revision, validation, immutable records, and 401/403/404 ownership cases verified. | Merged into `d2-staging`; not yet release-promoted. |
| S2-F10-P | AC-S2-15 to AC-S2-17 | Initial implementation `2de1252`; RED `d03aa7b`; GREEN `5b6353e`; `feature/s2-f10-performance` | `npm run test:unit` (9 passed); `npm run test:api -- benchmark.test.ts` (3 passed); `npm run build`; `npm run benchmark:seed`; `npm run benchmark:run` against local Docker Compose PostgreSQL 16 | PASS: 100,002 total records (100,000 benchmark rows plus two existing fixtures); 100 warm-up + 1,000 authenticated reads; final p95 187.46 ms, below 500 ms. See `docs/evidence/d2-s2/issue-102-tdd-evidence.md`. | Pending partner review and merge into `d2-staging`. |

## Regression note

The full `npm run test:api` rerun on 24 November 2026 timed out in the pre-existing authentication test `TEST-01.5 / AC-01.5` while calculating a bcrypt cost-12 hash under Jest's five-second test limit. This is outside S2-F10-P; its focused API test, unit suite, build, and real benchmark all passed as listed above. Track and resolve the regression separately before Sprint 2 release.
