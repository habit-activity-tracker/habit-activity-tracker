# S2-F06-S — Deterministic Streak Calculation

## Version history

| Version | Date | Author | Reviewer | Change |
|---|---|---|---|---|
| v1.0 | 24 November 2026 | Kulchaya Paipinij | Chayanit Kuntanarumitkul | Initial Sprint 2 streak contract. |

## Linked requirements and dependency

- **Feature:** F-06 Progress calculation, Sprint 2 extension `S2-F06-S`.
- **Requirements:** FR-11, BR-01, BR-02, BR-03, NFR-02, NFR-05.
- **Depends on:** Sprint 1 F-05 records and F-06 total progress; S2-F04-R current goal revision.
- **Data rule:** This contract does not change daily records or the revision model.

**System SDS impact:** The progress read path adds a deterministic computed field
`streak_days`; authentication, ownership middleware, persistence schema, and
record-write paths are unchanged. No migration is required.

## Domain rule: streak

1. A valid activity day is a distinct `activity_date` with a persisted daily record for the goal, within the immutable `start_date` and current active `end_date`.
2. Dates are calendar dates in `APP_TIMEZONE` (default `Asia/Bangkok`). Tests use an injected clock; the server UTC date is not used directly.
3. The active streak is consecutive valid calendar days ending on today when today has a record, or yesterday when today has not been recorded.
4. If neither today nor yesterday has a valid record, the streak is `0`. A missing day breaks the streak.
5. Future dates are excluded. Existing records older than seven days remain readable and countable; CR-01 limits new record creation only.
6. If S2-F04-R shortens `end_date`, records after the current end remain visible as immutable history but are excluded from the current streak. If the goal has ended, the streak is `0`.
7. The streak is computed from persisted records and is not stored or used to mutate any row.

Assume `APP_TIMEZONE = Asia/Bangkok` and today is `2026-11-24`:

| Valid record dates | Expected streak | Reason |
|---|---:|---|
| `2026-11-24`, `2026-11-23`, `2026-11-22` | 3 | Ends today. |
| `2026-11-23`, `2026-11-22` | 2 | Today is not recorded; ends yesterday. |
| `2026-11-24`, `2026-11-22` | 1 | `2026-11-23` is a gap. |
| `2026-11-22` only | 0 | Neither today nor yesterday is recorded. |
| `2026-11-17` only | 0 | Old history does not create an active streak. |

The boundary is the `APP_TIMEZONE` calendar midnight, not 24 elapsed hours.

## API and data contract

The existing owner-scoped progress response is extended with computed
`streak_days`; no new table or migration is required:

```json
{
  "progress": {
    "goal_id": "uuid",
    "total_recorded": 150,
    "target": 300,
    "percent": 50.0,
    "streak_days": 3
  }
}
```

Total progress is unchanged: `total / target * 100`, half-up rounded to one
decimal place and capped at `100.0`.

**Workflow:** the owner opens a goal, the service reads the current goal
context and persisted records, computes the streak using the injected/system
clock, and renders the value beside total progress. A reload repeats the same
read and computation; it does not save a streak counter.

Access behavior is unchanged: no session returns `401 SESSION_REQUIRED`, a
Program Manager returns `403 ROLE_FORBIDDEN`, and another Participant receives
`404 GOAL_NOT_FOUND`. The owner UI displays `streak_days` beside the existing
progress summary; loading, empty, and safe error states remain unchanged.

## Acceptance criteria

| ID | Observable outcome |
|---|---|
| **AC-S2-07** | Owner progress/summary returns deterministic `streak_days` from persisted valid records. |
| **AC-S2-08** | A gap breaks the streak; today-not-recorded ends at yesterday; no today/yesterday record returns `0`. |
| **AC-S2-09** | Streak uses `APP_TIMEZONE`, including midnight boundaries, and excludes future dates. |
| **AC-S2-10** | Existing total progress keeps half-up rounding and the 100% cap; revisions use current target/end-date context without mutating records. |

## Software Test Specification (STS)

| Test ID | Linked AC | Level | Setup / action | Expected result |
|---|---|---|---|---|
| **TEST-S2-07a** | AC-S2-07 | API/DB | Records on today, yesterday and two days ago. | `200`; streak is `3`; total and percent are correct. |
| **TEST-S2-07b** | AC-S2-07 | API/DB | Owner goal has no records. | `200`; streak `0`, total `0`, percent `0.0`. |
| **TEST-S2-08a** | AC-S2-08 | Unit/API | Records on today and two days ago; yesterday missing. | Streak is `1`. |
| **TEST-S2-08b** | AC-S2-08 | Unit/API | Records on yesterday and two days ago; today missing. | Streak is `2`. |
| **TEST-S2-08c** | AC-S2-08 | Unit/API | Only an older record exists. | Streak is `0`. |
| **TEST-S2-09a** | AC-S2-09 | Unit/API | Inject clock at 23:59 and 00:01 in Bangkok. | Calculation follows calendar dates, not elapsed hours. |
| **TEST-S2-09b** | AC-S2-09 | API/DB | A future row exists in a direct test fixture. | Future row is excluded. |
| **TEST-S2-10a** | AC-S2-10 | Unit/API | Totals `50.05` and `150`, target `100`. | Percent remains `50.1` and `100.0`; streak does not alter it. |
| **TEST-S2-10b** | AC-S2-10 | API/DB | Revision shortens end date beyond an existing record. | History remains; out-of-current-period row is excluded from streak; no row is mutated. |

## Definition of Done

- Contract is reviewed and merged before implementation code.
- Streak, gap, no-today, timezone, future-date, and revision boundaries have tests.
- Existing total-progress tests remain green and are not weakened.
- No migration or persisted streak counter is introduced.
