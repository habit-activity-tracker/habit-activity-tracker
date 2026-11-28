# Delivery 3 — Technical-debt register

This is a debt register, not an implementation claim. Items become DONE only after an approved scope change, implementation, and executed verification evidence. It consolidates the D2 status/debt contract and the D3 scope freeze without silently changing the released scope.

| ID | Area | Impact | Priority | Current status | Next action / acceptance evidence | Owner |
|---|---|---|---|---|---|---|
| SEC-01 / S3-Q01 | CSRF protection and request rate limiting | A browser session may be exposed to cross-site request risk; authentication endpoints lack an application-level abuse-control limit. | High | OPEN — not a baseline requirement and not implemented. | Approve a security scope change; threat-model cookie flows; add CSRF protection and route-appropriate rate limits; test allowed/blocked requests without logging credentials. | Team |
| OBS-01 / S3-Q02 | Redacted structured application-error logging | Diagnosis of unexpected failures is slower; unsafe ad-hoc logging would risk private data exposure. | Medium | OPEN — no structured safe logging contract is implemented. | Approve a logging schema/redaction policy; add correlation/error codes; verify logs exclude passwords, cookies, session IDs, connection strings and activity payloads. | Team |
| NFR-06-GAP / GAP-05 | Service/domain statement coverage | Measured service/domain statement coverage is **88.24%**, below the ≥90% target; AC-S3-13 cannot pass. | High | OPEN / INCOMPLETE. | Add meaningful tests for uncovered service/domain rules, rerun the documented coverage command on the release candidate, and record scope/totals. | Kulchaya |
| GAP-02 | UI component acceptance coverage | AC-34, AC-38, AC-44 and AC-50 have no dedicated component tests, reducing regression confidence in shared UI states. | Medium | OPEN / INCOMPLETE. | Add focused component tests or retain explicit incomplete status in final evidence. | Kulchaya |
| GAP-03 / NFR-03 | Deployed plaintext-password log inspection | bcrypt storage is tested, but deployed-log evidence has not proved submitted passwords are absent. | High | OPEN / INCOMPLETE. | Inspect only approved RC logs with a redaction-safe procedure; record command scope and PASS/FAIL without copying secrets. | Chayanit |
| GAP-04 | Deployed cookie attributes | Local/API evidence exists, but deployed `Set-Cookie` Secure/expiry evidence is absent. | Medium | OPEN / INCOMPLETE. | Inspect the approved RC login response with RC-only credentials; record attribute names/results, never cookie values. | Chayanit |
| NFR-07 / GAP-06 | Complete RPO evidence | Isolated restore proved RTO (57m22s) but did not measure a full incident-to-recovery RPO interval. | Medium | PARTIAL — restore exercise completed. | Define incident timestamp and backup-selection procedure; run a non-production exercise and measure RPO ≤24h without touching source/production. | Chayanit |
| OP-01 / OP-02 | RC deployment traceability and authenticated smoke | Current pipeline evidence is not an isolated RC deployment; no final RC version/commit/revision has been recorded. | High | BLOCKED — existing workflow deploys `main` to `habit-tracker` with 100% traffic. An isolated-RC provision/runbook is prepared, but no GCP access, cost approval, resource creation, RC deployment, or smoke evidence exists. | Obtain explicit approval for the documented RC-only set and USD $10/24–48h budget; create it, record digest/revision, then run authenticated smoke and UAT without using production values. | Chayanit |

## Decision rules

- Do not implement any debt item merely to close this register without an approved scope change.
- Priorities describe risk and verification urgency, not a promise to deploy a feature.
- Review this register with the final UAT/RC evidence; leave unverified items OPEN or INCOMPLETE.

## Review note — 28 November 2026

`npm audit --omit=dev --json` reported **0 production-dependency vulnerabilities** (150 production dependencies). The `npm ci` advisory count for development tooling does not by itself establish a deployed application vulnerability; track any future production audit finding under this register before changing dependency versions.
