# Issue 108 — Sprint 2 release and regression evidence

## Candidate under test

| Item | Value |
|---|---|
| Branch | `release/d2-sprint2-v0.2.0` |
| Base commit | `f078f55` — current `d2-staging` head after Issue 10 |
| Date | 25 November 2026, ICT |
| Database | Local PostgreSQL through Docker Compose, host port `5433` |
| Scope | Sprint 1 continuity, CR-01, S2 goal revisions/streak/history, S2 performance evidence, S3 F-11 reminder schedules |

## Automated regression results

Commands were run from the repository root on `f078f55`.

```text
npm run build
API build passed; Web TypeScript check and Vite build passed.

npm run test:unit
Test Suites: 6 passed, 6 total
Tests: 18 passed, 18 total

npm run test:api
Test Suites: 14 passed, 14 total
Tests: 79 passed, 79 total

npm run test:e2e
3 passed, 0 failed, 0 skipped
```

The E2E journey uses a runtime-relative Asia/Bangkok date and passed the login/logout, goal creation, record creation, progress/history, duplicate feedback, and reload checks. No test was deleted, skipped, weakened, or disabled for this release run.

## Cross-feature checks

| Area | Evidence | Result |
|---|---|---|
| Authentication | `auth.test.ts`, E2E auth journey | PASS |
| Roles and ownership | `access-control.sprint2.test.ts`, reminder access tests | PASS; 401/403/404 preserved |
| Goal revisions | `goals.revision.test.ts` | PASS |
| Streak/history summary | `sprint2.history.test.ts`, Issue 6 evidence | PASS |
| CR-01 seven-day record window | `records.test.ts`, Part A continuity evidence | PASS |
| Reminder schedules | `reminder-schedules.test.ts`, Issue 9 evidence | PASS; 6 focused tests |
| Performance | `docs/evidence/d2-s2/performance-benchmark.md` | PASS; p95 187.46 ms |
| Build and E2E | commands above | PASS |

No failed or skipped tests were observed in this candidate run. Open/planned gaps remain disclosed in the Part D matrix: NFR-06 coverage is 83.05% below target, NFR-03 log inspection is planned, and NFR-07 restore/RPO/RTO verification is planned.

## Release steps after review

1. Merge the evidence update into `d2-staging`.
2. Open release PR `d2-staging` → `main`; Chayanit reviews and approves.
3. Wait for `test-and-docker` to pass, then merge the release PR.
4. Create immutable tag `v0.2.0` at the release merge commit and verify `git rev-parse v0.2.0` matches that commit.
5. Record the tag and release PR in the completion table; do not push unrelated commits after the PDF submission commit.
