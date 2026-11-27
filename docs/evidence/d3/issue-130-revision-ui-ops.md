# Issue 130 — Revision UI and operations evidence

- **Version:** `1c86df4` (`feature/d3-revision-ui-ops`)
- **Role:** Chayanit (lead)
- **Date:** 27 November 2026 (Asia/Bangkok)
- **Status:** local implementation checks passed; deployment evidence is pending and is not claimed as PASS.

## Executed local checks

| Command | Actual result |
|---|---|
| `npm run build` | PASS — API TypeScript build and web production build completed. |
| `npm run test:unit` | PASS — 6 suites, 19 tests. |
| `npm run test:api` | PASS — 14 suites, 83 tests, independently rerun by Kulchaya. |
| `npm run test:e2e` | PASS — 4 tests. This includes the revision workflow browser test. Its API responses are stubbed deliberately; backend persistence, ownership, validation and record-integrity remain covered by `api/tests/api/goals.revision.test.ts`. |

## Regression found and fixed before approval

Kulchaya's review found a full-E2E failure: `e2e/journey.spec.ts` expected `50.0%` but observed `1.0%`. The test clicked the last generic `Record activity` button immediately after goal creation, before the new goal list had settled; it could therefore select an existing goal with a different target or permitted date range.

The fix selects the newly created goal by its API-returned ID, ignores stale goal-list responses, and changes the E2E assertion to wait for the created goal rather than using `.last()`. Adding Revision history also made the generic table selector ambiguous; it now targets the named Activity history table. The final full browser run passed 4/4.

## Deployment evidence still required

The feature branch has not been deployed. A read-only request to the current public service, `GET https://habit-tracker-tn5ktplddq-as.a.run.app/api/health`, returned `{"status":"ok"}` on 27 November 2026. That response is from the pre-Issue-130 deployment and does not contain the new `commit` field, so it cannot validate OP-02.

Before review approval, run the deployment workflow with its protected `SMOKE_EMAIL` and `SMOKE_PASSWORD`, retain the redacted authenticated smoke output, and record the deployed revision and full commit SHA. Inspect that revision's Cloud Run logs for submitted-password plaintext (GAP-03), and capture the deployed login response's `Set-Cookie` attributes and expiry (GAP-04). The local environment had no `gcloud` CLI, so those Cloud Run checks were not run here.
