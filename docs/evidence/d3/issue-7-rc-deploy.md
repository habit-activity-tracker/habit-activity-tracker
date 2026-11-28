# Delivery 3 — Issue 7 RC deployment record

**Branch:** `docs/d3-uat-defects`  
**Base candidate:** `3bb7830c44785841ee490dd0eb10a6431cd82d69` (`d3-staging`, merge of PR #144)
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

### Isolated-environment search result and cost boundary

The repository records a retained isolated restore target, `habit-tracker-restore-check-20261127`, from Issue 5. It is not yet a suitable RC environment: no RC Cloud Run service, RC secret set, write-capable migration identity, or current access confirmation is recorded. It must not be altered, used as a shared target, or deleted merely for this issue.

This workstation has neither the `gcloud` CLI nor a Google Cloud identity configured, so it cannot safely enumerate existing Cloud Run/Cloud SQL resources. No existing complete RC environment can therefore be confirmed from available evidence.

If creation is approved, the minimum isolated set is: one scale-to-zero Cloud Run RC service, one RC migration job, one dedicated least-privilege service account, RC-only Secret Manager values, and either a confirmed separate Cloud SQL target or a new smallest PostgreSQL instance/database. Artifact Registry may reuse the existing repository while using an immutable candidate tag; production service, database, secrets, job, and traffic must remain untouched.

For a short 24–48 hour UAT window, request a **USD $10 maximum budget** before creation. Cloud Run request-based services charge for active CPU/memory/request time and can scale to zero; Cloud SQL is the likely dominant hourly cost, with storage, backups and any egress additional. This is a conservative planning cap, not a quoted price: final cost depends on the selected `asia-southeast1` tier, storage, backup and actual request use. Confirm the configuration in the [Google Cloud pricing calculator](https://cloud.google.com/products/calculator) before creation; see the official [Cloud Run pricing](https://cloud.google.com/run/pricing) and [Cloud SQL pricing](https://cloud.google.com/sql/pricing) pages.

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

## Local preparation verification

| Check | Result |
|---|---|
| `git diff --check` | PASS — no whitespace errors. |
| `bash -n deploy/release.sh deploy/deploy.sh` | PASS — syntax-only; no deployment command was executed. |
| Python compile of `deploy/smoke_test.py` | PASS — in-memory syntax compile only; no smoke request was made. |
| `rc-release.sh` production-name guard | PASS — a deliberate `RC_SERVICE_NAME=habit-tracker` invocation exited before any `gcloud` call. |
| `npm run test:unit` | PASS — 6 suites, 19 tests. |
| `npm run build` | PASS — API TypeScript build and Vite production build. |
| Key API regressions on an isolated local Docker PostgreSQL 16 container (host port 5434) | PASS — auth 9 tests; goals + reminders 17 tests; records 19 tests. The container is local-only and not a GCP/production database. |
| Full API/E2E suite | Not claimed in this RC record. A full API invocation was started against the isolated local target, but its terminal completion output was unavailable; the verified targeted suites above are the reported result. |

## Planned, safe RC verification after approval

1. Confirm the target is non-production and its database/secrets are isolated.
2. Run migrations only against that RC target.
3. Capture immutable image digest, revision name, traffic allocation and `/api/health` reported commit.
4. Run the existing redacted smoke check with protected RC-only credentials.
5. Run the UAT-01 through UAT-11 scripts in `docs/deliverable-3/uat-plan.md`; record only observed results.
6. Inspect logs only with the approved RC identity; never copy passwords, cookies, tokens, connection strings or private activity data into evidence.

## Cloud Shell runbook — execute only after approval

The commands below are deliberately incomplete until an operator provides the approved non-production values. They do not create a service, job, database, secret, or image. Do not substitute `habit-tracker`, `habit-tracker-migrate`, `habit-tracker-pg`, or any production credential/database identifier.

```sh
git clone https://github.com/habit-activity-tracker/habit-activity-tracker.git
cd habit-activity-tracker
git fetch origin d3-staging
git checkout 3bb7830c44785841ee490dd0eb10a6431cd82d69

# Set only approved isolated-target values; do not paste secrets into shell history.
export PROJECT_ID='APPROVED_NON_PRODUCTION_PROJECT'
export REGION='asia-southeast1'
export RC_SERVICE_NAME='APPROVED_RC_SERVICE'
export RC_MIGRATE_JOB_NAME='APPROVED_RC_MIGRATION_JOB'
export GIT_COMMIT_SHA='3bb7830c44785841ee490dd0eb10a6431cd82d69'
export RC_IMAGE_DIGEST='APPROVED_ARTIFACT_REGISTRY_IMAGE@sha256:REPLACE'
export CONFIRM_RC_TARGET='RC-ISOLATED'

# Read-only identity/target checks. Confirm the service/job configuration refers
# only to the approved RC database secrets before continuing.
gcloud auth list
gcloud run services describe "$RC_SERVICE_NAME" --project="$PROJECT_ID" --region="$REGION"
gcloud run jobs describe "$RC_MIGRATE_JOB_NAME" --project="$PROJECT_ID" --region="$REGION"

# This is the first mutating command: it updates/executes only the RC job/service.
bash deploy/rc-release.sh
export RC_SERVICE_URL="$(gcloud run services describe "$RC_SERVICE_NAME" --project="$PROJECT_ID" --region="$REGION" --format='value(status.url)')"
```

After the script prints the URL/revision/digest, retain those values and run the smoke check with RC-only credentials supplied through a secure terminal mechanism (not committed and not echoed):

```sh
export SMOKE_EMAIL='RC_TEST_ACCOUNT_EMAIL'
read -rs SMOKE_PASSWORD
python3 deploy/smoke_test.py "$RC_SERVICE_URL"
unset SMOKE_PASSWORD SMOKE_EMAIL
```

`deploy/smoke_test.py` runs authenticated checks whenever both smoke variables are present. If either credential is unavailable, stop and record the smoke test as BLOCKED rather than accepting an unauthenticated-only result.
