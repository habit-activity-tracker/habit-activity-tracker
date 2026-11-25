# Issue 103 — S2-F06-S and S2-F07-S TDD Evidence

**Branch:** `feature/s2-f06-f07-streak-history`  
**Base:** `d2-staging` at `b35fc8b`  
**Contract:** Issue 4 / PR #114, merged before implementation  
**RED:** `ece0285` — `test: add RED tests for streak calculation`  
**GREEN:** `6da30d5` — `feat: add Sprint 2 streak and history summary`

## RED result

The new streak unit test failed before implementation because
`api/src/services/streak.ts` did not exist. Existing unit tests remained green:

```text
Test Suites: 1 failed, 5 passed, 6 total
Tests:       14 passed, 14 total
```

## GREEN implementation

- Added deterministic `calculateStreak` with calendar-date boundaries, gap/today/yesterday behavior, future-date exclusion, and current goal-period bounds.
- Added `streak_days` to the owner progress response.
- Added owner-scoped `GET /api/goals/:id/summary` with current goal/revision context, records, total, percent, and streak.
- Added API authorization coverage for 401, 403, and privacy-safe 404.
- Updated the goal UI to use the summary endpoint and display current streak and goal version.
- No notification, schema, or historical-record mutation was introduced.

## Verification on GREEN commit

| Command | Result |
|---|---|
| `npm test` | PASS — 6 unit suites / 18 passed; 12 API suites / 69 passed; 0 failed, 0 skipped |
| `npm run build` | PASS — API TypeScript and Web Vite builds |
| `npm run test:e2e` | PASS — 3 passed, 0 failed, 0 skipped |
| `npm run migrate` | PASS — local Docker PostgreSQL migration applied |

The API suite includes `sprint2.history.test.ts`, covering progress streak,
summary payload, revision context, and 401/403/404 access behavior. The E2E
journey verifies persisted progress/history and duplicate feedback after reload.
