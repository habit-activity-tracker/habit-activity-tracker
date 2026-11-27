# Delivery 3 — Full Endpoint List

**Version:** 1.0  
**Date:** 27 November 2026 (Asia/Bangkok)  
**Author:** Chayanit Kuntanarumitkul (67070503408)  
**Reviewer:** Kulchaya Paipinij — must check this list against the live router source files  
**Source commit:** `9af6280` (tag `v0.2.0`, HEAD of `main`)  
**Purpose:** Authoritative input for Issue 3 access matrix and `access-check.sh`

---

## Router source files

| File | Mount path |
|---|---|
| `api/src/app.ts` | Mounts all routers |
| `api/src/routes/auth.routes.ts` | `/api/auth`, `/api` |
| `api/src/routes/goals.routes.ts` | `/api/goals` |
| `api/src/routes/records.routes.ts` | `/api/goals/:id/records` |
| `api/src/routes/progress.routes.ts` | `/api/goals/:id/progress` |
| `api/src/routes/templates.routes.ts` | `/api/activity-templates`, `/api/templates` |

---

## Complete endpoint list

### Infrastructure (no auth required)

| # | Method | Full path | Auth | Role | Ownership | AC reference |
|---|---|---|---|---|---|---|
| E-00a | GET | `/api/health` | None | Any | None | OP-01 smoke |
| E-00b | GET | `/api/ready` | None | Any | None | OP-01 smoke |

### Authentication

| # | Method | Full path | Auth | Role | Ownership | AC reference |
|---|---|---|---|---|---|---|
| E-01 | POST | `/api/auth/login` | None | Any | None | AC-01, AC-02, AC-02a; PD-03a |
| E-02 | GET | `/api/auth/me` | Session | participant, program_manager | None — returns caller only | AC-03, AC-04 |
| E-03 | POST | `/api/auth/logout` | Session | participant, program_manager | None — invalidates caller session | AC-05 |
| E-04 | GET | `/api/me` | Session | participant, program_manager | None — alias for `/api/auth/me` | AC-03, AC-04 |

### Activity Templates (Sprint 1)

| # | Method | Full path | Auth | Role | Ownership | AC reference |
|---|---|---|---|---|---|---|
| E-05 | POST | `/api/activity-templates` | Session | program_manager only | None | AC-31, AC-32 |
| E-06 | GET | `/api/activity-templates` | Session | participant (active only), program_manager (all) | None | AC-35, AC-35a, AC-36 |
| E-07 | PATCH | `/api/activity-templates/:id` | Session | program_manager only | None | AC-17, AC-18, AC-19 |
| E-05b | POST | `/api/templates` | Session | program_manager only | None | Alias for E-05 |
| E-06b | GET | `/api/templates` | Session | participant (active only), program_manager (all) | None | Alias for E-06 |
| E-07b | PATCH | `/api/templates/:id` | Session | program_manager only | None | Alias for E-07 |

### Goals (Sprint 1 + Sprint 2 revisions)

| # | Method | Full path | Auth | Role | Ownership | AC reference |
|---|---|---|---|---|---|---|
| E-08 | POST | `/api/goals` | Session | participant only | Creates record owned by caller | AC-39, AC-40, AC-42 |
| E-09 | GET | `/api/goals` | Session | participant only | Returns only caller's goals | AC-44, AC-48 |
| E-10 | GET | `/api/goals/:id` | Session | participant only | 404 if other participant's goal | AC-43, AC-49 |
| E-11 | GET | `/api/goals/:id/summary` | Session | participant only | 404 if other participant's goal | AC-S2-11, AC-S2-12 |
| E-12 | POST | `/api/goals/:id/revisions` | Session | participant only | 404 if other participant's goal | AC-S2-01, AC-S2-02 |
| E-13 | GET | `/api/goals/:id/revisions` | Session | participant only | 404 if other participant's goal | AC-S2-03, AC-S2-04 |

> **Added after Sprint 1:** E-11 (summary), E-12 (create revision), E-13 (list revisions)

### Reminder Schedules (Sprint 3)

| # | Method | Full path | Auth | Role | Ownership | AC reference |
|---|---|---|---|---|---|---|
| E-14 | POST | `/api/goals/:id/reminder-schedules` | Session | participant only | 404 if other participant's goal | AC-S3-01, AC-S3-02, AC-S3-03, AC-S3-04, AC-S3-05, AC-S3-08 |
| E-15 | GET | `/api/goals/:id/reminder-schedules` | Session | participant only | 404 if other participant's goal | AC-S3-01, AC-S3-02, AC-S3-06, AC-S3-08 |

> **Added after Sprint 1:** E-14, E-15

### Daily Records (Sprint 1)

| # | Method | Full path | Auth | Role | Ownership | AC reference |
|---|---|---|---|---|---|---|
| E-16 | POST | `/api/goals/:id/records` | Session | participant only | 404 if other participant's goal | AC-08, AC-11, AC-12, AC-13, AC-14, AC-16 |
| E-17 | GET | `/api/goals/:id/records` | Session | participant only | 404 if other participant's goal | AC-08, AC-25 |

### Progress (Sprint 1)

| # | Method | Full path | Auth | Role | Ownership | AC reference |
|---|---|---|---|---|---|---|
| E-18 | GET | `/api/goals/:id/progress` | Session | participant only | 404 if other participant's goal | AC-45, AC-46, AC-47, AC-S2-07, AC-S2-10 |

---

## Endpoints NOT present (do not appear in access matrix)

The following HTTP methods do not exist in the codebase and must return `404 Not Found` from the framework (not an application-level auth check):

- `PATCH /api/goals/:id` → returns `404` (confirmed by AC-43 and `goals.test.ts`)
- `DELETE /api/goals/:id` → returns `404`
- `PATCH /api/goals/:id/reminder-schedules/:sid` → not implemented (scope boundary: Sprint 3 is create/list only)
- `DELETE /api/goals/:id/reminder-schedules/:sid` → not implemented

---

## Access rule summary (for all goal sub-resources)

The `requireOwnedGoal` middleware in `api/src/middleware/goalOwnership.ts` enforces the following check order:

1. **401 SESSION_REQUIRED** — no session cookie / invalid session
2. **403 ROLE_FORBIDDEN** — authenticated but not a participant (e.g., program_manager)
3. **404 GOAL_NOT_FOUND** — goal does not exist OR belongs to a different participant

No private goal/record/schedule data appears in a 403 or 404 body.

---

## Reviewer checklist

Kulchaya must verify this list against the router source at `9af6280` before approving:

- [ ] All `router.get/post/patch/delete` calls in `goals.routes.ts` are listed
- [ ] All `router.get/post/patch/delete` calls in `auth.routes.ts` are listed (including both mount paths)
- [ ] All calls in `records.routes.ts`, `progress.routes.ts`, `templates.routes.ts` are listed
- [ ] The `/api/templates` and `/api/activity-templates` alias is correctly noted
- [ ] No endpoint added in d2-staging or v0.2.0 is missing
