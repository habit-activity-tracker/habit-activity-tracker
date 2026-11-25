# Sprint 3 contract status and unpromoted debt

## Feature status register

Only these values are used: `planned`, `in progress`, `implemented`, `tested`, `accepted`. A contract being written does not mean the feature is implemented or tested.

| Delivery ID | Status | Contract / scope | Acceptance criteria |
|---|---|---|---|
| S3-F11-R | planned | [Reminder schedules](S3-F11-R-reminder-schedules.md); create/list and computed next occurrence only. | AC-S3-01 to AC-S3-09 |
| S3-F10-O | planned | [Operational readiness](S3-F10-O-operational-readiness.md). | AC-S3-10 to AC-S3-12 |
| S3-F10-Q | planned | [Verification hardening](S3-F10-Q-verification-hardening.md). | AC-S3-13 to AC-S3-14 |
| S3-Q01 | planned debt | CSRF and rate limiting; not an approved baseline requirement. | None |
| S3-Q02 | planned debt | Redacted structured error logging; not an approved baseline requirement. | None |

## S3-Q01 — CSRF and rate-limit debt

**Status:** `planned debt`; no implementation, acceptance criteria, or pass claim is authorized in Delivery 2 unless a scope decision promotes it.

The current session-cookie API has no CSRF-token and rate-limit feature in the approved baseline. Before work begins, create a change record that identifies threat model, affected routes, compatibility/security trade-offs, validation/error behavior, tests, rollout, and owner. A later implementation must not log tokens or use a client-visible bypass.

## S3-Q02 — Safe structured error-logging debt

**Status:** `planned debt`; no implementation, acceptance criteria, or pass claim is authorized in Delivery 2 unless a scope decision promotes it.

The observed invalid-JSON diagnostic gap may justify structured error logging, but a scope decision must first define event schema, retention/access control, correlation identifiers, redaction policy, and tests. Passwords, session IDs, cookies, authorization headers, database URLs, request bodies containing credentials, and private goal/record payloads are prohibited from logs and evidence.

## Change-control rule

S3-Q01 or S3-Q02 can receive numbered AC only after an approved change-record entry updates scope. Until then they remain visible debt and cannot be used to claim an unapproved security/observability feature is complete.
