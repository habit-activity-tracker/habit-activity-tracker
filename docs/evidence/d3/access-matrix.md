# Delivery 3 — Access Matrix

**Version:** pre-run v1.0  
**Branch:** `test/d3-access-matrix`  
**Base:** `8f2ca85` (`d3-staging`, after Issue 2)  
**Lead:** Chayanit | **Reviewer:** Kulchaya  

Run `scripts/access-check.sh` against local Docker and the deployed Cloud Run URL. Until an output file names a commit, role and date, every Actual/result cell remains **NOT RUN**.

| Endpoint(s) | AC / feature | No session | Wrong role | Other participant record | Valid role/owner | Actual / result |
|---|---|---|---|---|---|---|
| E-00a `GET /api/health`, E-00b `GET /api/ready` | OP-01 | 200 | n/a | n/a | 200 | NOT RUN |
| E-01 `POST /api/auth/login` | AC-01, AC-02, AC-02a, AC-02b | 200 valid credentials; 400 malformed JSON | n/a | n/a | 200 valid credentials | NOT RUN |
| E-02 `GET /api/auth/me`, E-04 `GET /api/me` | AC-03, AC-04 | 401 `SESSION_REQUIRED` | n/a | n/a | 200 caller only | NOT RUN |
| E-03 `POST /api/auth/logout` | AC-05 | 401 `SESSION_REQUIRED` | n/a | n/a | 204 | NOT RUN |
| E-05/E-05b `POST /api/activity-templates`, `/api/templates` | AC-31, AC-32 | 401 | participant: 403 | n/a | manager: 201 | NOT RUN |
| E-06/E-06b `GET /api/activity-templates`, `/api/templates` | AC-35, AC-35a, AC-36 | 401 | n/a (both roles allowed) | n/a | 200 | NOT RUN |
| E-07/E-07b `PATCH /api/activity-templates/:id`, aliases | AC-17–19 | 401 | participant: 403 | n/a | manager: 200 | NOT RUN |
| E-08 `POST /api/goals` | AC-39, AC-40, AC-42 | 401 | manager: 403 | n/a | participant: 201 | NOT RUN |
| E-09 `GET /api/goals` | AC-44, AC-48 | 401 | manager: 403 | n/a | participant: 200, own list | NOT RUN |
| E-10 `GET /api/goals/:id` | AC-43, AC-49 | 401 | manager: 403 | 404 `GOAL_NOT_FOUND` | owner: 200 | NOT RUN |
| E-11 `GET /api/goals/:id/summary` | AC-S2-11, AC-S2-12, AC-S2-14 | 401 | manager: 403 | 404 | owner: 200 | NOT RUN |
| E-12 `POST /api/goals/:id/revisions` | AC-S2-01, AC-S2-02, AC-S2-05 | 401 | manager: 403 | 404 | owner: 201 | NOT RUN |
| E-13 `GET /api/goals/:id/revisions` | AC-S2-05, AC-S2-11, AC-S2-13 | 401 | manager: 403 | 404 | owner: 200 | NOT RUN |
| E-14 `POST /api/goals/:id/reminder-schedules` | AC-S3-01–05, AC-S3-08 | 401 | manager: 403 | 404 | owner: 201 | NOT RUN |
| E-15 `GET /api/goals/:id/reminder-schedules` | AC-S3-01, AC-S3-02, AC-S3-06, AC-S3-08 | 401 | manager: 403 | 404 | owner: 200 | NOT RUN |
| E-16 `POST /api/goals/:id/records` | AC-08, AC-11–14, AC-16 | 401 | manager: 403 | 404 | owner: 201 | NOT RUN |
| E-17 `GET /api/goals/:id/records` | AC-08, AC-25 | 401 | manager: 403 | 404 | owner: 200 | NOT RUN |
| E-18 `GET /api/goals/:id/progress` | AC-45–47, AC-S2-07, AC-S2-10 | 401 | manager: 403 | 404 | owner: 200 | NOT RUN |
| Unsupported `PATCH`/`DELETE /api/goals/:id` | AC-43 | 404 `ROUTE_NOT_FOUND` (route absent) | n/a | n/a | 404 `ROUTE_NOT_FOUND` | NOT RUN |

## Ordering checks

For E-10–E-18 with a malformed goal ID, current code expects `401` without a session, `403` for a manager session, then `400 INVALID_GOAL_ID` for an authenticated participant. A valid UUID owned by another participant returns `404 GOAL_NOT_FOUND`.

## PDF excerpt

Use the saved output line for E-13, for example: setup = Alice/Bob synthetic goals; assertion = Bob gets 404 on Alice revision history while Alice gets 200; result = the recorded run result/version. Do not include cookie jars or passwords.
