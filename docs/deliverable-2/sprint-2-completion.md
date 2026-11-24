# Sprint 2 completion table

This table records executed implementation evidence. A row is marked released only after its implementation PR has received partner review and merged into `d2-staging`.

| Delivery ID | Acceptance criteria | Implementation / branch | Executed verification | Result | Release |
|---|---|---|---|---|---|
| S2-F10-P | AC-S2-15 to AC-S2-17 | `2de1252`, `feature/s2-f10-performance` | `npm run test:unit` (9 passed); `npm run test:api -- benchmark.test.ts` (2 passed); `npm run build`; `npm run benchmark:seed`; `npm run benchmark:run` against local Docker Compose PostgreSQL 16 | PASS: 100,002 total records (100,000 benchmark records plus 2 existing fixtures); 100 warm-up + 1,000 measured authenticated reads; p95 262.63 ms, below 500 ms. See `docs/evidence/d2-s2/performance-benchmark.md`. | Pending partner review and merge into `d2-staging` |

## Regression note

The full `npm run test:api` rerun on 24 November 2026 timed out in the pre-existing authentication test `TEST-01.5 / AC-01.5` while calculating a bcrypt cost-12 hash under Jest's five-second test limit. This is outside S2-F10-P; its focused API test, unit suite, build, and real benchmark all passed as listed above. Track and resolve the regression separately before Sprint 2 release.
