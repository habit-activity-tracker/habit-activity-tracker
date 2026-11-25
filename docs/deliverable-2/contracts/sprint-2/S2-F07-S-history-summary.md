# S2-F07-S — Owner History and Progress Summary

## Version history

| Version | Date | Author | Reviewer | Change |
|---|---|---|---|---|
| v1.0 | 24 November 2026 | Kulchaya Paipinij | Chayanit Kuntanarumitkul | Initial Sprint 2 history-summary contract. |

## Linked requirements and dependency

- **Feature:** F-07 History and progress views, Sprint 2 extension `S2-F07-S`.
- **Requirements:** FR-08, FR-11, FR-13, FR-15, NFR-02, NFR-05.
- **Depends on:** F-01, F-02, F-04, F-05, S2-F04-R goal revisions, and S2-F06-S streak.
- **Preserved rule:** Existing records older than seven days remain readable and counted. CR-01 limits new record creation only.

**System SDS impact:** Add one owner-scoped read workflow and its response
mapping; reuse existing authentication, ownership, goal, record, and revision
components. No schema migration, record mutation, or notification integration
is required.

## User workflow

An authenticated Participant opens an owned goal and sees its current target,
total, rounded/capped percent, active streak, goal version/end date, revision
context, and chronological activity history. Empty, populated, loading,
retryable-error, forbidden, and not-found states are supported.

Reloading recomputes the summary from persisted data. No calculated value is
stored, and no historical record is rewritten.

The summary contains the current goal and revision context, for example:

```json
{
  "goal": {
    "id": "uuid",
    "version": 2,
    "target": 500,
    "start_date": "2026-11-01",
    "end_date": "2026-12-15"
  },
  "summary": {
    "total_recorded": 150,
    "percent": 30.0,
    "streak_days": 3
  },
  "records": [{ "activity_date": "2026-11-03", "quantity": 50 }],
  "revisions": [{ "version_number": 2, "target": 500, "end_date": "2026-12-15", "effective_date": "2026-11-24" }]
}
```

## API, permissions, and data

The new owner-scoped endpoint is:

`GET /api/goals/:id/summary`

It returns `200 OK` with `goal`, `summary`, `records`, and `revisions` fields
as shown above. The existing `GET /api/goals/:id`, `GET /progress`, and
`GET /records` responses remain compatible. The endpoint must not expose
another participant's data.

Permission order remains:

1. No session: `401 SESSION_REQUIRED`.
2. Program Manager: `403 ROLE_FORBIDDEN`.
3. Another Participant or absent goal: `404 GOAL_NOT_FOUND`.
4. Malformed goal ID: `400 INVALID_GOAL_ID` after authentication/role checks.

No migration is required. The summary reads stable goal, revision, record, and
template data. Computed total, percent, and streak are not persisted.

**Workflow:** the owner opens the goal summary, the service performs the
existing session/role/ownership checks, reads the current goal and revision
history plus all records, computes total/percent/streak, and returns the
summary. The UI renders loading, empty, populated, and safe error states; a
reload repeats the read without mutating stored data.

## Acceptance criteria

| ID | Observable outcome |
|---|---|
| **AC-S2-11** | Owner can retrieve current goal context, total progress, streak, revision context, and chronological history before and after reload. |
| **AC-S2-12** | Empty and populated goal states are distinguishable; an empty goal returns total `0`, percent `0.0`, streak `0`, and no fabricated history. |
| **AC-S2-13** | Revision context is visible while all existing records, including records older than seven days, remain listed and counted according to the current progress contract. |
| **AC-S2-14** | Manager receives 403, another Participant receives privacy-safe 404, and an unauthenticated caller receives 401 without private data disclosure. |

## Software Test Specification (STS)

| Test ID | Linked AC | Level | Setup / action | Expected result |
|---|---|---|---|---|
| **TEST-S2-11** | AC-S2-11 | API/UI | Owner goal has records and a revision; open summary and reload. | Current target/version, total, percent, streak, revision context, and chronological history persist visibly. |
| **TEST-S2-12a** | AC-S2-12 | API/UI | Owner goal has no records. | Empty state; total `0`, percent `0.0`, streak `0`, no fabricated row. |
| **TEST-S2-12b** | AC-S2-12 | API/UI | Owner goal has multiple records. | Populated state lists each record once in ascending date order. |
| **TEST-S2-13a** | AC-S2-13 | API/DB | Existing records include dates older than seven days. | Old records remain readable and counted; current goal context is shown. |
| **TEST-S2-13b** | AC-S2-13 | API/DB | Goal is revised by S2-F04-R. | Current target/end/version and revision list are shown; historical records remain unchanged. |
| **TEST-S2-14a** | AC-S2-14 | API | No session requests the summary. | `401 SESSION_REQUIRED`; no summary body. |
| **TEST-S2-14b** | AC-S2-14 | API | Program Manager requests a Participant goal. | `403 ROLE_FORBIDDEN`; no private body. |
| **TEST-S2-14c** | AC-S2-14 | API | Another Participant requests the goal. | `404 GOAL_NOT_FOUND`; no existence leak. |
| **TEST-S2-14d** | AC-S2-14 | UI | Owner, Manager, and another Participant view the route. | Owner sees summary; unauthorized users see safe error UI. |

## Definition of Done

- Contract is reviewed and merged before implementation code.
- Every AC has an observable API/UI or database test.
- Existing total-progress, ownership, and historical-record behavior remains covered.
- Implementation names the selected summary route and response fields.
- No calculated summary field or historical record is persisted or mutated.
