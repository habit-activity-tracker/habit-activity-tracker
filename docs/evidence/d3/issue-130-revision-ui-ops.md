# Issue 130 — Revision UI and operations evidence

- **Version:** `b998e86` (`feature/d3-revision-ui-ops`)
- **Role:** Chayanit (lead)
- **Date:** 27 November 2026 (Asia/Bangkok)
- **Status:** local implementation checks passed; deployment evidence is pending and is not claimed as PASS.

## Executed local checks

| Command | Actual result |
|---|---|
| `npm run build` | PASS — API TypeScript build and web production build completed. |
| `npm run test:unit` | PASS — 6 suites, 19 tests. |
| `npm run test:e2e -- e2e/revision.spec.ts` | PASS — 1 revision workflow browser test. The spec stubs API responses deliberately; backend persistence, ownership, validation and record-integrity checks remain in `api/tests/api/goals.revision.test.ts`. |
| `npm run test:api` | NOT RUN to completion — local PostgreSQL test service at `localhost:5433` was unavailable (`ECONNREFUSED`), and Docker Desktop was not running. This is an environment blocker, not a PASS or a timeout result. |

## Deployment evidence still required

The feature branch has not been deployed. A read-only request to the current public service, `GET https://habit-tracker-tn5ktplddq-as.a.run.app/api/health`, returned `{"status":"ok"}` on 27 November 2026. That response is from the pre-Issue-130 deployment and does not contain the new `commit` field, so it cannot validate OP-02.

Before review approval, run the deployment workflow with its protected `SMOKE_EMAIL` and `SMOKE_PASSWORD`, retain the redacted authenticated smoke output, and record the deployed revision and full commit SHA. Inspect that revision's Cloud Run logs for submitted-password plaintext (GAP-03), and capture the deployed login response's `Set-Cookie` attributes and expiry (GAP-04). The local environment had no `gcloud` CLI, so those Cloud Run checks were not run here.
