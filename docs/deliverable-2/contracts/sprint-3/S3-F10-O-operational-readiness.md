# S3-F10-O — Operational readiness and recovery evidence

## Status and requirements

**Status:** `planned`. This is an evidence-producing release-readiness feature, not a new application endpoint.

- **Feature / requirement:** F-10, NFR-07.
- **Target:** production secrets are managed/injected rather than committed; recovery point objective (RPO) is at most 24 hours and recovery time objective (RTO) is at most 4 hours.
- **Dependencies:** D2-GATE-01, an approved release candidate, deployment access, and the existing Cloud Run / Cloud SQL runbook.

## Operational workflow and immutable evidence

1. Create a candidate from a reviewed commit; CI builds the image and records its full commit SHA and immutable digest.
2. Configure runtime secrets only through Secret Manager / managed platform bindings. Repository, evidence, screenshots, container image layers, and logs must not contain plaintext `SESSION_SECRET`, `DATABASE_URL`, service-account keys, cookies, or passwords.
3. Record the latest successful Cloud SQL backup timestamp. It must be no older than 24 hours at the restore-test start.
4. Restore into an isolated recovery target; do not overwrite the production instance. Measure from restore start to a healthy application/readiness check. The measured elapsed time must be at most four hours.
5. Verify a known non-sensitive fixture or count from before backup exists on the recovery target, then retain only redacted identifiers, timestamps, SHA/digest, commands, and result in evidence.
6. Verify candidate liveness/readiness and commit/digest identity after deployment; do not claim a deployment succeeded solely because a workflow started.

## Acceptance criteria

| ID | Observable outcome |
|---|---|
| **AC-S3-10** | Release configuration uses managed secret injection; repository and captured evidence contain no secret value, connection string, token, password, or key. |
| **AC-S3-11** | A documented isolated restore starts from a backup no older than 24 hours and restores verifiable application data without overwriting production. |
| **AC-S3-12** | The restore/readiness exercise completes within four hours and the deployed candidate is identified by reviewed commit SHA and immutable image digest with healthy API checks. |

## Software Test Specification

| Test ID | AC | Level | Setup / action | Expected result / evidence |
|---|---|---|---|---|
| TEST-S3-10 | 10 | Config/review | Inspect IaC/workflow, Cloud Run environment bindings, Git tracked files, image/config logs, and screenshots. | Secret references only; secret scan/review passes; redacted evidence contains no values. |
| TEST-S3-11 | 11 | Operational exercise | Record backup timestamp; restore to isolated Cloud SQL target; run migration-compatible readiness and non-sensitive data verification. | Backup age ≤24h; production untouched; recovery target passes proof query/check. |
| TEST-S3-12a | 12 | Operational exercise | Timestamp restore start and healthy `/api/health` + `/api/ready` completion. | Elapsed time ≤4h, timestamps retained. |
| TEST-S3-12b | 12 | Deploy verification | Compare reviewed merge SHA, CI image tag/digest, Cloud Run revision digest, and smoke result. | All identifiers agree; candidate endpoints healthy. |

## Evidence and non-goals

Save timestamped, sanitized output under `docs/evidence/d2-s3/`: backup metadata, restore start/end, recovery target identifier without connection details, readiness/health statuses, commit SHA/image digest, and reviewer text. Screenshots must mask account data, connection strings, and secrets.

No destructive production restore, secret rotation, schema redesign, or new feature is authorized by this contract. A failed RPO/RTO measurement is recorded as a failed result and blocks acceptance; it is never rewritten as a passing claim.

## Definition of Done

- AC-S3-10 through AC-S3-12 have executed, reviewed evidence.
- RPO/RTO values and release identity are recorded with units/timezone.
- Any deviation has an issue, owner, and release-blocking decision.
