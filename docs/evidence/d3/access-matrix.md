# Delivery 3 — Access Matrix

**Version:** `e2a0161` (`test/d3-access-matrix`)  
**Branch:** `test/d3-access-matrix`  
**Base:** `8f2ca85` (`d3-staging`, after Issue 2)  
**Lead:** Chayanit | **Reviewer:** Kulchaya  
**Date:** 27 November 2026 (Asia/Bangkok)

### Execution summary

- **Local Docker (`http://localhost:8080`, `e2a0161`):** **74/74 PASS** (`fail=0`) — see [access-check-docker.txt](access-check-docker.txt).
- **Cloud Run (`https://habit-tracker-860543640437.asia-southeast1.run.app`, `v0.2.0` pre-RC):** **73/74 PASS, 1 FAIL** (`fail=1`) — see [access-check-cloudrun.txt](access-check-cloudrun.txt). The single `FAIL` is `E-01 malformed JSON login` (`expected=400 actual=500`) because Cloud Run is still serving `v0.2.0` (`main`) before Issue 2's PD-03a fix (`5ba5905`) is deployed in Issue 7 (RC deploy).

| Endpoint(s) | AC / feature | No session | Wrong role | Other participant record | Valid role/owner | Actual / result |
|---|---|---|---|---|---|---|
| E-00a `GET /api/health`, E-00b `GET /api/ready` | OP-01 | 200 | n/a | n/a | 200 | PASS (Docker 200; Cloud Run 200) |
| E-01 `POST /api/auth/login` | AC-01, AC-02, AC-02a, AC-02b | 200 valid; 400 malformed JSON; 401 bad password | n/a | n/a | 200 valid credentials | Docker: PASS (400/401/200); Cloud Run: 401/200 PASS, malformed JSON 500 FAIL (`v0.2.0` pre-RC) |
| E-02 `GET /api/auth/me`, E-04 `GET /api/me` | AC-03, AC-04 | 401 `SESSION_REQUIRED` | n/a | n/a | 200 caller only | PASS (Docker & Cloud Run) |
| E-03 `POST /api/auth/logout` | AC-05 | 401 `SESSION_REQUIRED` | n/a | n/a | 204 (then `/me` 401) | PASS (Docker & Cloud Run) |
| E-05/E-05b `POST /api/activity-templates`, `/api/templates` | AC-31, AC-32 | 401 | participant: 403 | n/a | manager: 201 | PASS (Docker & Cloud Run) |
| E-06/E-06b `GET /api/activity-templates`, `/api/templates` | AC-35, AC-35a, AC-36 | 401 | n/a (both roles allowed) | n/a | 200 | PASS (Docker & Cloud Run) |
| E-07/E-07b `PATCH /api/activity-templates/:id`, aliases | AC-17–19 | 401 | participant: 403 | n/a | manager: 200 | PASS (Docker & Cloud Run) |
| E-08 `POST /api/goals` | AC-39, AC-40, AC-42 | 401 | manager: 403 | n/a | participant: 201 | PASS (Docker & Cloud Run) |
| E-09 `GET /api/goals` | AC-44, AC-48 | 401 | manager: 403 | n/a | participant: 200, own list | PASS (Docker & Cloud Run) |
| E-10 `GET /api/goals/:id` | AC-43, AC-49 | 401 | manager: 403 | 404 `GOAL_NOT_FOUND` | owner: 200 | PASS (Docker & Cloud Run) |
| E-11 `GET /api/goals/:id/summary` | AC-S2-11, AC-S2-12, AC-S2-14 | 401 | manager: 403 | 404 | owner: 200 | PASS (Docker & Cloud Run) |
| E-12 `POST /api/goals/:id/revisions` | AC-S2-01, AC-S2-02, AC-S2-05 | 401 | manager: 403 | 404 | owner: 201 | PASS (Docker & Cloud Run) |
| E-13 `GET /api/goals/:id/revisions` | AC-S2-05, AC-S2-11, AC-S2-13 | 401 | manager: 403 | 404 | owner: 200 | PASS (Docker & Cloud Run) |
| E-14 `POST /api/goals/:id/reminder-schedules` | AC-S3-01–05, AC-S3-08 | 401 | manager: 403 | 404 | owner: 201 | PASS (Docker & Cloud Run) |
| E-15 `GET /api/goals/:id/reminder-schedules` | AC-S3-01, AC-S3-02, AC-S3-06, AC-S3-08 | 401 | manager: 403 | 404 | owner: 200 | PASS (Docker & Cloud Run) |
| E-16 `POST /api/goals/:id/records` | AC-08, AC-11–14, AC-16 | 401 | manager: 403 | 404 | owner: 201 | PASS (Docker & Cloud Run) |
| E-17 `GET /api/goals/:id/records` | AC-08, AC-25 | 401 | manager: 403 | 404 | owner: 200 | PASS (Docker & Cloud Run) |
| E-18 `GET /api/goals/:id/progress` | AC-45–47, AC-S2-07, AC-S2-10 | 401 | manager: 403 | 404 | owner: 200 | PASS (Docker & Cloud Run) |
| Unsupported `PATCH`/`DELETE /api/goals/:id` | AC-43 | 404 `ROUTE_NOT_FOUND` (route absent) | n/a | n/a | 404 `ROUTE_NOT_FOUND` | PASS (Docker & Cloud Run) |

## Ordering checks

For E-10–E-18 with a malformed goal ID, current code expects `401` without a session, `403` for a manager session, then `400 INVALID_GOAL_ID` for an authenticated participant. A valid UUID owned by another participant returns `404 GOAL_NOT_FOUND`.

## PDF excerpt

- **Setup:** Synthetic seeded accounts (`pm1@example.com`, `alice@example.com`, `bob@example.com`) via `scripts/access-check.sh` against Cloud Run (`e2a0161`, 27 Nov 2026); Alice creates goal `eafb9f74-a55e-4264-818e-28f68a56b039`.
- **Assertion (E-13 `GET /api/goals/:id/revisions`):** Unauthenticated → `401`; Program Manager → `403`; Bob (other participant) → `404`; Alice (owner) → `200`.
- **Result:**
  ```text
  PASS no-session GET /api/goals/eafb9f74-a55e-4264-818e-28f68a56b039/revisions expected=401 actual=401
  PASS PM GET /api/goals/eafb9f74-a55e-4264-818e-28f68a56b039/revisions expected=403 actual=403
  PASS Bob GET Alice /api/goals/eafb9f74-a55e-4264-818e-28f68a56b039/revisions expected=404 actual=404
  PASS Alice GET /api/goals/eafb9f74-a55e-4264-818e-28f68a56b039/revisions expected=200 actual=200
  ```
