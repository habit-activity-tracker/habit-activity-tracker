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

If creation is approved, use this exact isolated naming set in the same project (not the production names):

| Resource | Approved-to-create RC name | Isolation rule |
|---|---|---|
| Cloud Run service | `habit-tracker-rc-20261128` | Never `habit-tracker`; scale-to-zero, maximum one instance. |
| Migration / seed jobs | `habit-tracker-rc-migrate-20261128`, `habit-tracker-rc-seed-20261128` | Separate jobs, connected only to the RC SQL instance. |
| Cloud SQL / database / user | `habit-tracker-rc-pg-20261128` / `habit_tracker_rc` / `habit_tracker_rc_app` | New instance; do not use `habit-tracker-pg` or `habit-tracker-restore-check-20261127`. |
| Runtime identity | `habit-tracker-rc-runner-20261128` | Cloud SQL Client plus per-secret access only. |
| Secret Manager | `habit-tracker-rc-20261128-{database-url,session-secret,demo-password}` | New generated values; secret names and values must not be copied from production. |
| Image | Existing `habit-tracker` Artifact Registry repository, candidate's immutable digest | Reuse of an image repository is safe; service, SQL and secrets remain RC-only. |

### Planning cost estimate — 24 to 48 hours

This is an estimate, not an invoice. Assumptions are a PostgreSQL 16 Enterprise `db-f1-micro` single-zone instance, 10 GB SSD, no automated backup retained beyond the test, no meaningful internet egress, one Cloud Run service at minimum instances zero / maximum one, a small number of UAT requests, and one Cloud Build image build. Exact regional rates and any account credits/free tiers must be confirmed in the pricing calculator before approval.

**Pre-provisioning pricing check (28 November 2026):** the current official Cloud SQL shared-core reference price for `db-f1-micro` is USD 0.0105/hour and SSD capacity is USD 0.000232877/GiB-hour. At 48 hours, these two known components are about USD 0.504 + USD 0.112 for the planned 10 GiB disk; allowing a full 10 GiB backup adds about USD 0.053 at the published backup rate. The RC plan therefore remains below the USD 10 authorization even after its stated allowance for Cloud Run, Cloud Build and image storage. This check does not expose or read project billing data. The Cloud Shell operator must stop before creation if the signed-in pricing calculator, selected tier/region, quota, or required extra resource changes this scope.

| Item | 24-hour planning range (USD) | 48-hour planning range (USD) | Notes |
|---|---:|---:|---|
| Cloud SQL instance compute | 0.25–0.36 | 0.50–0.72 | Dominant cost; the published small-instance reference rate is about USD 0.0105/hour, but regional/tier availability must be confirmed. |
| Cloud SQL 10 GB SSD and short backup retention | 0.06–0.12 | 0.11–0.24 | Pro-rated storage; backup or retained data can increase it. |
| Cloud Run service and two short jobs | 0.00–0.20 | 0.00–0.30 | Normally within free/request-based use for a short UAT; not guaranteed if free tier is unavailable or load is high. |
| Artifact Registry image storage | 0.00–0.05 | 0.00–0.05 | First 0.5 GiB-month is free; keeping the image longer may bill storage. |
| Secret Manager (three new active versions) | 0.00 | 0.00 | Active versions up to six months are currently free; access operations have a free allowance. |
| Cloud Build | 0.00–0.20 | 0.00–0.20 | Depends on build duration and any remaining free build-minutes. |
| **Expected subtotal** | **0.31–0.93** | **0.61–1.51** | Excludes unexpected egress, retries, logs beyond free allocation, or retained resources. |

Approve a **USD 10 maximum budget** to cover the stated uncertainty, but delete the RC SQL instance promptly after evidence capture: its compute charge continues while it exists. Cloud Run can scale to zero, but retained SQL, Artifact Registry images, secret versions, backups, and logs can continue to accrue storage charges. Pricing references: [Cloud SQL](https://cloud.google.com/sql/pricing), [Cloud Run](https://cloud.google.com/run/pricing), [Artifact Registry](https://cloud.google.com/artifact-registry/pricing), and [Secret Manager](https://cloud.google.com/secret-manager/pricing).

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

This is a prepared plan, **not evidence of execution**. Steps 1–2 are read-only. Steps 3–7 create billable resources and require explicit approval and a budget confirmation. Do not substitute `habit-tracker`, `habit-tracker-migrate`, `habit-tracker-pg`, `habit-tracker-restore-check-20261127`, or a production credential/database identifier.

```sh
git clone https://github.com/habit-activity-tracker/habit-activity-tracker.git
cd habit-activity-tracker
git fetch origin docs/d3-uat-defects d3-staging
git checkout docs/d3-uat-defects

export PROJECT_ID='cpe334-sec31-ctrl-c-chaya-lab'
export REGION='asia-southeast1'
export RC_SUFFIX='20261128'
export RC_SERVICE_NAME="habit-tracker-rc-${RC_SUFFIX}"
export RC_MIGRATE_JOB_NAME="habit-tracker-rc-migrate-${RC_SUFFIX}"
export RC_SEED_JOB_NAME="habit-tracker-rc-seed-${RC_SUFFIX}"
export RC_SQL_INSTANCE="habit-tracker-rc-pg-${RC_SUFFIX}"
export RC_DATABASE='habit_tracker_rc'
export RC_DB_USER='habit_tracker_rc_app'
export RC_SA_NAME="habit-tracker-rc-runner-${RC_SUFFIX}"
export RC_SA_EMAIL="${RC_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
export RC_DATABASE_SECRET="habit-tracker-rc-${RC_SUFFIX}-database-url"
export RC_SESSION_SECRET="habit-tracker-rc-${RC_SUFFIX}-session-secret"
export RC_DEMO_PASSWORD_SECRET="habit-tracker-rc-${RC_SUFFIX}-demo-password"
export GIT_COMMIT_SHA='3bb7830c44785841ee490dd0eb10a6431cd82d69'
export CONFIRM_RC_TARGET='RC-ISOLATED'

# Step 1 — read-only identity/project checks. Stop if the project is not exact.
gcloud auth list
gcloud config set project "$PROJECT_ID"
test "$(gcloud config get-value project)" = "$PROJECT_ID"
gcloud projects describe "$PROJECT_ID" --format='value(projectId)'
for selected in "$RC_SERVICE_NAME" "$RC_MIGRATE_JOB_NAME" "$RC_SQL_INSTANCE"; do for protected in habit-tracker habit-tracker-migrate habit-tracker-pg habit-tracker-restore-check-20261127; do test "$selected" != "$protected" || { echo 'protected name selected'; exit 2; }; done; done

# Step 2 — read-only absence check: stop if these RC names already exist.
gcloud run services describe "$RC_SERVICE_NAME" --project="$PROJECT_ID" --region="$REGION" && exit 2 || true
gcloud sql instances describe "$RC_SQL_INSTANCE" --project="$PROJECT_ID" && exit 2 || true
```

### Provisioning steps — explicit approval and budget required

```sh
# Step 3 — enable APIs if necessary; then create the dedicated RC identity.
gcloud services enable run.googleapis.com sqladmin.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com iam.googleapis.com --project="$PROJECT_ID"
gcloud iam service-accounts create "$RC_SA_NAME" --display-name='Habit Tracker isolated RC runtime' --project="$PROJECT_ID"
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:${RC_SA_EMAIL}" --role='roles/cloudsql.client' --condition=None --quiet

# Step 4 — create a NEW smallest RC PostgreSQL instance and isolated database.
# Do not configure authorised networks; Cloud Run connects using Cloud SQL.
gcloud sql instances create "$RC_SQL_INSTANCE" --database-version=POSTGRES_16 --edition=enterprise --tier=db-f1-micro --region="$REGION" --storage-size=10GB --storage-type=SSD --no-storage-auto-increase --backup-start-time=03:00 --project="$PROJECT_ID"
gcloud sql databases create "$RC_DATABASE" --instance="$RC_SQL_INSTANCE" --project="$PROJECT_ID"
gcloud sql instances describe "$RC_SQL_INSTANCE" --project="$PROJECT_ID" --format='yaml(name,region,databaseVersion,settings.tier,settings.dataDiskSizeGb,settings.ipConfiguration.authorizedNetworks)'

# Step 5 — generate RC-only values privately. Do not echo, commit, or retrieve
# any production secret. The SQL CLI needs a password argument; read prevents
# shell-history exposure, so run only in a private Cloud Shell terminal.
read -rs -p 'New RC database password: ' RC_DB_PASSWORD; echo
gcloud sql users create "$RC_DB_USER" --instance="$RC_SQL_INSTANCE" --password="$RC_DB_PASSWORD" --project="$PROJECT_ID"
for secret in "$RC_DATABASE_SECRET" "$RC_SESSION_SECRET" "$RC_DEMO_PASSWORD_SECRET"; do gcloud secrets create "$secret" --replication-policy=automatic --project="$PROJECT_ID"; done
export RC_SQL_CONNECTION_NAME="${PROJECT_ID}:${REGION}:${RC_SQL_INSTANCE}"
printf '%s' "postgresql://${RC_DB_USER}:${RC_DB_PASSWORD}@localhost/${RC_DATABASE}?host=/cloudsql/${RC_SQL_CONNECTION_NAME}" | gcloud secrets versions add "$RC_DATABASE_SECRET" --data-file=- --project="$PROJECT_ID"
openssl rand -hex 32 | tr -d '\n' | gcloud secrets versions add "$RC_SESSION_SECRET" --data-file=- --project="$PROJECT_ID"
openssl rand -base64 18 | tr -d '/+=\n' | cut -c1-16 | { read -r p; printf '%sAa1' "$p"; } | gcloud secrets versions add "$RC_DEMO_PASSWORD_SECRET" --data-file=- --project="$PROJECT_ID"
unset RC_DB_PASSWORD
for secret in "$RC_DATABASE_SECRET" "$RC_SESSION_SECRET" "$RC_DEMO_PASSWORD_SECRET"; do gcloud secrets add-iam-policy-binding "$secret" --member="serviceAccount:${RC_SA_EMAIL}" --role='roles/secretmanager.secretAccessor' --project="$PROJECT_ID" --quiet; done

# Step 6 — build the candidate and resolve its immutable digest.
export IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/habit-tracker/habit-tracker:${GIT_COMMIT_SHA}"
gcloud builds submit --tag="$IMAGE_URI" --project="$PROJECT_ID"
export RC_IMAGE_DIGEST="$(gcloud artifacts docker images describe "$IMAGE_URI" --format='value(image_summary.digest)' --project="$PROJECT_ID")"
test -n "$RC_IMAGE_DIGEST"
export RC_IMAGE_DIGEST="${REGION}-docker.pkg.dev/${PROJECT_ID}/habit-tracker/habit-tracker@${RC_IMAGE_DIGEST}"
```

```sh
# Step 7 — create jobs/service wired ONLY to isolated SQL and secret names.
export RC_SECRETS="DATABASE_URL=${RC_DATABASE_SECRET}:latest,SESSION_SECRET=${RC_SESSION_SECRET}:latest,SEED_DEMO_PASSWORD=${RC_DEMO_PASSWORD_SECRET}:latest"
export RC_ENV="NODE_ENV=production,APP_ENV=rc,APP_TIMEZONE=Asia/Bangkok,SESSION_TTL=24,GIT_COMMIT_SHA=${GIT_COMMIT_SHA}"
gcloud run jobs deploy "$RC_MIGRATE_JOB_NAME" --image="$RC_IMAGE_DIGEST" --region="$REGION" --service-account="$RC_SA_EMAIL" --set-cloudsql-instances="$RC_SQL_CONNECTION_NAME" --set-secrets="$RC_SECRETS" --set-env-vars="$RC_ENV" --command=node --args=api/dist/src/db/migrate.js --max-retries=1 --task-timeout=300s --project="$PROJECT_ID"
gcloud run jobs deploy "$RC_SEED_JOB_NAME" --image="$RC_IMAGE_DIGEST" --region="$REGION" --service-account="$RC_SA_EMAIL" --set-cloudsql-instances="$RC_SQL_CONNECTION_NAME" --set-secrets="$RC_SECRETS" --set-env-vars="$RC_ENV" --command=node --args=api/dist/src/seed/seed.js --max-retries=0 --task-timeout=300s --project="$PROJECT_ID"
gcloud run deploy "$RC_SERVICE_NAME" --image="$RC_IMAGE_DIGEST" --region="$REGION" --allow-unauthenticated --service-account="$RC_SA_EMAIL" --add-cloudsql-instances="$RC_SQL_CONNECTION_NAME" --set-secrets="$RC_SECRETS" --set-env-vars="$RC_ENV" --min-instances=0 --max-instances=1 --memory=512Mi --cpu=1 --port=3000 --project="$PROJECT_ID"

# Verify metadata only (names, never secret values), then migrate and seed once.
gcloud run services describe "$RC_SERVICE_NAME" --project="$PROJECT_ID" --region="$REGION" --format=export | grep -E "${RC_SA_EMAIL}|${RC_SQL_CONNECTION_NAME}|${RC_DATABASE_SECRET}|${RC_SESSION_SECRET}|${RC_DEMO_PASSWORD_SECRET}"
gcloud run jobs describe "$RC_MIGRATE_JOB_NAME" --project="$PROJECT_ID" --region="$REGION" --format=export | grep -E "${RC_SA_EMAIL}|${RC_SQL_CONNECTION_NAME}|${RC_DATABASE_SECRET}|${RC_SESSION_SECRET}|${RC_DEMO_PASSWORD_SECRET}"
gcloud run jobs execute "$RC_MIGRATE_JOB_NAME" --wait --project="$PROJECT_ID" --region="$REGION"
gcloud run jobs execute "$RC_SEED_JOB_NAME" --wait --project="$PROJECT_ID" --region="$REGION"

# Step 8 — the guarded script can now update only the pre-verified RC target.
bash deploy/rc-release.sh
export RC_SERVICE_URL="$(gcloud run services describe "$RC_SERVICE_NAME" --project="$PROJECT_ID" --region="$REGION" --format='value(status.url)')"
curl --fail --silent --show-error "$RC_SERVICE_URL/api/health"
curl --fail --silent --show-error "$RC_SERVICE_URL/api/ready"
```

The seed job creates only synthetic `pm1@example.com`, `alice@example.com`, and `bob@example.com` accounts in the **new RC database**, with the newly generated RC demo-password secret. These accounts share no database, session secret, password value, or session state with production. Read the RC password privately only when an independent tester needs it; do not record it in evidence.

### Smoke, evidence and cleanup

```sh
# Run only with an RC synthetic account; never paste its password into a command.
export SMOKE_EMAIL='pm1@example.com'
read -rs -p 'RC demo password: ' SMOKE_PASSWORD; echo
export EXPECTED_COMMIT_SHA="$GIT_COMMIT_SHA"
python3 deploy/smoke_test.py "$RC_SERVICE_URL"
unset SMOKE_PASSWORD SMOKE_EMAIL

# Record only URL, full SHA, digest, revision, traffic and redacted PASS/FAIL.
gcloud run services describe "$RC_SERVICE_NAME" --project="$PROJECT_ID" --region="$REGION" --format='yaml(status.url,status.latestReadyRevisionName,status.traffic)'

# Cleanup after UAT/evidence approval. These are destructive RC-only commands;
# re-check every variable before executing. Delete SQL last after evidence capture.
gcloud run services delete "$RC_SERVICE_NAME" --project="$PROJECT_ID" --region="$REGION" --quiet
gcloud run jobs delete "$RC_MIGRATE_JOB_NAME" --project="$PROJECT_ID" --region="$REGION" --quiet
gcloud run jobs delete "$RC_SEED_JOB_NAME" --project="$PROJECT_ID" --region="$REGION" --quiet
gcloud sql instances delete "$RC_SQL_INSTANCE" --project="$PROJECT_ID" --quiet
for secret in "$RC_DATABASE_SECRET" "$RC_SESSION_SECRET" "$RC_DEMO_PASSWORD_SECRET"; do gcloud secrets delete "$secret" --project="$PROJECT_ID" --quiet; done
gcloud iam service-accounts delete "$RC_SA_EMAIL" --project="$PROJECT_ID" --quiet
```

Never delete the Artifact Registry candidate image until the review/evidence-retention decision is made; it may incur a small storage charge. After that decision, delete only the RC candidate digest, never a shared production tag.
