# Delivery 3 — Issue 7 RC deployment record

**Branch:** `docs/d3-uat-defects`  
**Base candidate:** `3bb7830` (`d3-staging`, merge of PR #144)  
**Date:** 28 November 2026 (Asia/Bangkok)  
**Status:** **NOT DEPLOYED — blocked before any GCP mutation**

## Prerequisite and merge audit

The Delivery 3 candidate contains the required earlier work:

| Dependency | Evidence in `d3-staging` | Status |
|---|---|---|
| Issue 2 — test fixes / malformed JSON / no dispatch | PR #139 merge `8f2ca85`; GREEN `5ba5905`; evidence `docs/evidence/d3/issue-2-tests-fixes.md` | Merged |
| Issue 3 — access matrix | PR #140 merge `5a4f6a8`; Cloud Run/Docker matrix evidence | Merged |
| Issue 4 — revision UI and deployment-smoke changes | PR #142 merge `9d7b6b4`; implementation `b998e86`; evidence `docs/evidence/d3/issue-130-revision-ui-ops.md` | Merged |

## Existing pipeline inspection

` .github/workflows/deploy.yml` is intentionally a production release pipeline:

1. It triggers on push to `main` (or a manual dispatch on `main`).
2. It builds/pushes an image and invokes `deploy/release.sh`.
3. `deploy/release.sh` updates the fixed Cloud Run service `habit-tracker`, runs the fixed migration job `habit-tracker-migrate`, then shifts **100%** traffic to the latest revision.

The workflow supplies Cloud Run/Cloud SQL runtime configuration and optional protected smoke credentials. It does not accept an RC service name, separate database target, or traffic tag. Therefore using it for this candidate would deploy over the existing production/demo service, which Issue 7 explicitly prohibits.

The most recent successful deploy workflow is run [#45992153373](https://github.com/habit-activity-tracker/habit-activity-tracker/actions/runs/45992153373), triggered from `main` commit `91f4ec85e2653317924840f75f3c58aca425374b`. It is historical pipeline evidence only: it is not the current candidate (`3bb7830`) and is not counted as an Issue 7 RC deployment.

## RC approval gate

No deployment, migration execution, Cloud Run revision, Cloud SQL operation, Artifact Registry image, or other billable GCP resource was created for Issue 7. Before an RC deployment can proceed, the team must approve one of these isolated, cost-scoped paths:

1. An existing non-production Cloud Run service and non-production Cloud SQL target, with confirmed credentials and no production traffic; or
2. Creation of an RC-specific service/database/resources, including project/region, budget owner, cleanup date, and approval for estimated billing.

After approval, record the actual values below; do not fill them from a planned command:

| Field | Actual value |
|---|---|
| RC service URL | Not deployed |
| Git commit / image tag | Not deployed |
| Immutable image digest | Not deployed |
| Cloud Run revision / traffic | Not deployed |
| Migration-job execution | Not run |
| Smoke result | Not run |
| Authenticated journey result | Not run |

## Planned, safe RC verification after approval

1. Confirm the target is non-production and its database/secrets are isolated.
2. Run migrations only against that RC target.
3. Capture immutable image digest, revision name, traffic allocation and `/api/health` reported commit.
4. Run the existing redacted smoke check with protected RC-only credentials.
5. Run the UAT-01 through UAT-11 scripts in `docs/deliverable-3/uat-plan.md`; record only observed results.
6. Inspect logs only with the approved RC identity; never copy passwords, cookies, tokens, connection strings or private activity data into evidence.
