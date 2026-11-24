# Issue 104 — Sprint 2 Access-Control and Ownership Evidence

**Branch:** `test/d2-access-control`  
**Base:** `d2-staging` at `46deebc`  
**Scope:** Available Sprint 2 endpoints from Issues 5 and 6  
**Pending dependency:** F-11 reminder endpoints from Issue 9

## Automated test excerpt

Source: `api/tests/api/access-control.sprint2.test.ts`

The matrix checks the owner, unauthenticated caller, Program Manager, and other
Participant against:

- `GET /api/goals/:id/progress`
- `GET /api/goals/:id/summary`
- `GET /api/goals/:id/revisions`
- `POST /api/goals/:id/revisions`

Expected access behavior is 401 before role/ownership checks, 403 for the
Program Manager, 404 for another Participant, and successful access for the
owner. The focused run passed:

```text
npm run test:api -- access-control.sprint2.test.ts
Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
```

## Manual partner evidence

Chayanit must run the following with a local seeded account or private local
credentials. Do not paste passwords, cookies, session tokens, or secrets into
the repository or PR:

```bash
# Set only in the local shell; do not commit these values.
BASE_URL=http://127.0.0.1:3000
GOAL_ID=<Alice-owned-goal-id>

# Bob must receive privacy-safe 404.
curl -i -b bob.cookies "$BASE_URL/api/goals/$GOAL_ID/summary"

# Manager must receive 403.
curl -i -b manager.cookies "$BASE_URL/api/goals/$GOAL_ID/summary"

# No cookie must receive 401.
curl -i "$BASE_URL/api/goals/$GOAL_ID/summary"
```

Record only the status line and sanitized error code/body. The reminder-schedule
endpoint cannot be included until Issue 9 creates it; Issue 7 remains open for
that dependency and for the partner's curl screenshot/evidence.

## Manual partner execution — Chayanit

**Machine:** Darwin 23.6.0 x86_64 (local Docker Compose PostgreSQL on port 5433)

**Commit:** `28d0981`

**Time:** 25 November 2026, 00:07:58 ICT (UTC+07:00)

**Endpoint:** `GET /api/goals/:id/summary` for an Alice-owned goal

The curl requests used local cookie jars stored in a temporary directory. The
directory was deleted after the run; no cookie, password, token, goal ID, or
other secret is recorded here.

| Caller | Expected | Actual sanitized response | Result |
|---|---|---|---|
| Bob (another Participant) | `404 GOAL_NOT_FOUND` | `404` — `GOAL_NOT_FOUND` | PASS |
| Program Manager | `403 ROLE_FORBIDDEN` | `403` — `ROLE_FORBIDDEN` | PASS |
| No session | `401 SESSION_REQUIRED` | `401` — `SESSION_REQUIRED` | PASS |

The responses contained only the documented generic error messages and empty
`details` objects. In particular, Bob's response did not disclose goal data or
whether the Alice-owned goal exists.
