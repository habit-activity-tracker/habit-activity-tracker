# Issue #133 — isolated RC Cloud Shell provisioning runbook

**Status:** reviewed plan only; none of these commands has been executed by this repository.  Run only in the preflighted Cloud Shell account and project.  The commands deliberately create only `habit-tracker-rc-*` resources and never read a secret value.

## Candidate and guardrails

The exact application candidate is `3bb7830c44785841ee490dd0eb10a6431cd82d69`, the current tip of `d3-staging` at review time. Its immutable image digest is intentionally **unknown until the build completes**; resolve it from Artifact Registry in step 5 and do not substitute a tag for a digest.

The planned set is one Cloud Run service, migration and seed jobs, one `db-f1-micro` Cloud SQL instance with a 10 GiB disk, one database/user, one service account, and three RC-only secrets. No VPC connector, load balancer, replica, production secret, production database, or restore-check resource is in scope. Stop before any creation if this set changes or the signed-in calculator estimate exceeds USD 10.

## 1. Fetch and pin the exact source — read-only

```bash
set -Eeuo pipefail
trap 'status=$?; printf "ERROR: line %s (exit %s)\\n" "$LINENO" "$status" >&2; exit "$status"' ERR
umask 077

export PROJECT_ID='cpe334-sec31-ctrl-c-chaya-lab'
export REGION='asia-southeast1'
export RC_SUFFIX='20261128'
export RC_SOURCE_COMMIT='3bb7830c44785841ee490dd0eb10a6431cd82d69'
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
export RC_SQL_CONNECTION_NAME="${PROJECT_ID}:${REGION}:${RC_SQL_INSTANCE}"

gcloud config set project "$PROJECT_ID"
test "$(gcloud config get-value project)" = "$PROJECT_ID"
gcloud projects describe "$PROJECT_ID" --format='value(projectId)' | grep -Fxq "$PROJECT_ID"

git clone https://github.com/habit-activity-tracker/habit-activity-tracker.git habit-tracker-rc
cd habit-tracker-rc
git fetch origin d3-staging docs/d3-uat-defects
git cat-file -e "${RC_SOURCE_COMMIT}^{commit}"
test "$(git rev-parse origin/d3-staging)" = "$RC_SOURCE_COMMIT"
git worktree add --detach ../habit-tracker-rc-source "$RC_SOURCE_COMMIT"
export RC_SOURCE_DIR="$(cd ../habit-tracker-rc-source && pwd)"
test "$(git -C "$RC_SOURCE_DIR" rev-parse HEAD)" = "$RC_SOURCE_COMMIT"

# Production and retained restore-check names are forbidden, not prefixes.
for selected in "$RC_SERVICE_NAME" "$RC_MIGRATE_JOB_NAME" "$RC_SEED_JOB_NAME" "$RC_SQL_INSTANCE"; do
  for protected in habit-tracker habit-tracker-migrate habit-tracker-seed habit-tracker-pg habit-tracker-restore-check-20261127; do
    test "$selected" != "$protected" || { echo "Protected resource selected: $protected" >&2; exit 2; }
  done
done
```

## 2. Confirm all intended RC names are absent — read-only

Each assignment fails on an access/list error before the `grep` check, so a permission failure is never treated as an absent resource.

```bash
RUN_SERVICES="$(gcloud run services list --project="$PROJECT_ID" --region="$REGION" --format='value(metadata.name)')"
RUN_JOBS="$(gcloud run jobs list --project="$PROJECT_ID" --region="$REGION" --format='value(metadata.name)')"
SQL_INSTANCES="$(gcloud sql instances list --project="$PROJECT_ID" --format='value(name)')"
SERVICE_ACCOUNTS="$(gcloud iam service-accounts list --project="$PROJECT_ID" --format='value(email)')"
SECRETS="$(gcloud secrets list --project="$PROJECT_ID" --format='value(name)')"
for name in "$RC_SERVICE_NAME"; do ! grep -Fxq "$name" <<<"$RUN_SERVICES" || { echo "RC service exists: $name" >&2; exit 2; }; done
for name in "$RC_MIGRATE_JOB_NAME" "$RC_SEED_JOB_NAME"; do ! grep -Fxq "$name" <<<"$RUN_JOBS" || { echo "RC job exists: $name" >&2; exit 2; }; done
! grep -Fxq "$RC_SQL_INSTANCE" <<<"$SQL_INSTANCES" || { echo 'RC SQL instance exists' >&2; exit 2; }
! grep -Fxq "$RC_SA_EMAIL" <<<"$SERVICE_ACCOUNTS" || { echo 'RC service account exists' >&2; exit 2; }
for name in "$RC_DATABASE_SECRET" "$RC_SESSION_SECRET" "$RC_DEMO_PASSWORD_SECRET"; do ! grep -Fxq "$name" <<<"$SECRETS" || { echo "RC secret exists: $name" >&2; exit 2; }; done
```

## 3. Create the runtime identity — **creates an IAM resource**

```bash
gcloud iam service-accounts create "$RC_SA_NAME" --display-name='Habit Tracker isolated RC runtime' --project="$PROJECT_ID" --quiet
gcloud iam service-accounts describe "$RC_SA_EMAIL" --project="$PROJECT_ID" --format='value(email)' | grep -Fxq "$RC_SA_EMAIL"
gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:${RC_SA_EMAIL}" --role='roles/cloudsql.client' --condition=None --quiet
gcloud projects get-iam-policy "$PROJECT_ID" --flatten='bindings[].members' --filter="bindings.role:roles/cloudsql.client AND bindings.members:serviceAccount:${RC_SA_EMAIL}" --format='value(bindings.role)' | grep -Fxq 'roles/cloudsql.client'
```

## 4. Create and verify isolated PostgreSQL — **creates billable Cloud SQL**

```bash
gcloud sql instances create "$RC_SQL_INSTANCE" --database-version=POSTGRES_16 --edition=enterprise --tier=db-f1-micro --region="$REGION" --storage-size=10GB --storage-type=SSD --no-storage-auto-increase --backup-start-time=03:00 --project="$PROJECT_ID" --quiet
gcloud sql instances describe "$RC_SQL_INSTANCE" --project="$PROJECT_ID" --format='value(state)' | grep -Fxq RUNNABLE
gcloud sql instances describe "$RC_SQL_INSTANCE" --project="$PROJECT_ID" --format='yaml(name,region,databaseVersion,settings.tier,settings.dataDiskSizeGb,settings.availabilityType,settings.ipConfiguration.authorizedNetworks)'
gcloud sql databases create "$RC_DATABASE" --instance="$RC_SQL_INSTANCE" --project="$PROJECT_ID" --quiet
gcloud sql databases describe "$RC_DATABASE" --instance="$RC_SQL_INSTANCE" --project="$PROJECT_ID" --format='value(name)' | grep -Fxq "$RC_DATABASE"

# Hex is URL-safe. Do not echo this value or put it in shell history.
RC_DB_PASSWORD="$(openssl rand -hex 24)"
gcloud sql users create "$RC_DB_USER" --instance="$RC_SQL_INSTANCE" --password="$RC_DB_PASSWORD" --project="$PROJECT_ID" --quiet
gcloud sql users list --instance="$RC_SQL_INSTANCE" --project="$PROJECT_ID" --format='value(name)' | grep -Fxq "$RC_DB_USER"
export RC_DATABASE_URL="postgresql://${RC_DB_USER}:${RC_DB_PASSWORD}@localhost/${RC_DATABASE}?host=/cloudsql/${RC_SQL_CONNECTION_NAME}"
node -e 'new URL(process.env.RC_DATABASE_URL)' # validates the format required by api/src/config/env.ts
```

## 5. Create secrets and the immutable image — **secrets/build/storage may bill**

```bash
for secret in "$RC_DATABASE_SECRET" "$RC_SESSION_SECRET" "$RC_DEMO_PASSWORD_SECRET"; do
  gcloud secrets create "$secret" --replication-policy=automatic --project="$PROJECT_ID" --quiet
  gcloud secrets describe "$secret" --project="$PROJECT_ID" --format='value(name)' | grep -Fxq "projects/${PROJECT_ID}/secrets/${secret}"
done
printf '%s' "$RC_DATABASE_URL" | gcloud secrets versions add "$RC_DATABASE_SECRET" --data-file=- --project="$PROJECT_ID" --quiet
openssl rand -hex 32 | tr -d '\n' | gcloud secrets versions add "$RC_SESSION_SECRET" --data-file=- --project="$PROJECT_ID" --quiet
openssl rand -base64 24 | tr -d '/+=\n' | cut -c1-20 | { read -r value; printf '%sAa1' "$value"; } | gcloud secrets versions add "$RC_DEMO_PASSWORD_SECRET" --data-file=- --project="$PROJECT_ID" --quiet
unset RC_DATABASE_URL RC_DB_PASSWORD
for secret in "$RC_DATABASE_SECRET" "$RC_SESSION_SECRET" "$RC_DEMO_PASSWORD_SECRET"; do
  gcloud secrets add-iam-policy-binding "$secret" --member="serviceAccount:${RC_SA_EMAIL}" --role='roles/secretmanager.secretAccessor' --project="$PROJECT_ID" --quiet
  gcloud secrets get-iam-policy "$secret" --project="$PROJECT_ID" --flatten='bindings[].members' --filter="bindings.role:roles/secretmanager.secretAccessor AND bindings.members:serviceAccount:${RC_SA_EMAIL}" --format='value(bindings.role)' | grep -Fxq 'roles/secretmanager.secretAccessor'
done

export IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/habit-tracker/habit-tracker:${RC_SOURCE_COMMIT}"
gcloud builds submit "$RC_SOURCE_DIR" --tag="$IMAGE_URI" --project="$PROJECT_ID" --quiet
export RC_IMAGE_DIGEST="$(gcloud artifacts docker images describe "$IMAGE_URI" --project="$PROJECT_ID" --format='value(image_summary.fully_qualified_digest)')"
[[ "$RC_IMAGE_DIGEST" == "${REGION}-docker.pkg.dev/${PROJECT_ID}/habit-tracker/habit-tracker@sha256:"* ]] || { echo 'Immutable digest was not resolved.' >&2; exit 2; }
```

## 6. Migrate and seed before exposing the service — **creates Cloud Run jobs / execution billing**

`api/src/db/migrate.ts` is invoked by `node api/dist/src/db/migrate.js`; it opens the PostgreSQL URL and applies pending SQL files transactionally. `api/src/seed/seed.ts` is invoked by `node api/dist/src/seed/seed.js`; it creates only the three synthetic accounts and is insert-only.

```bash
export RC_SECRETS="DATABASE_URL=${RC_DATABASE_SECRET}:latest,SESSION_SECRET=${RC_SESSION_SECRET}:latest,SEED_DEMO_PASSWORD=${RC_DEMO_PASSWORD_SECRET}:latest"
export RC_ENV="NODE_ENV=production,APP_ENV=rc,APP_TIMEZONE=Asia/Bangkok,SESSION_TTL=24,GIT_COMMIT_SHA=${RC_SOURCE_COMMIT}"
for job in "$RC_MIGRATE_JOB_NAME" "$RC_SEED_JOB_NAME"; do
  entry='api/dist/src/db/migrate.js'; retries=1
  if test "$job" = "$RC_SEED_JOB_NAME"; then entry='api/dist/src/seed/seed.js'; retries=0; fi
  gcloud run jobs deploy "$job" --image="$RC_IMAGE_DIGEST" --region="$REGION" --service-account="$RC_SA_EMAIL" --set-cloudsql-instances="$RC_SQL_CONNECTION_NAME" --set-secrets="$RC_SECRETS" --set-env-vars="$RC_ENV" --command=node --args="$entry" --max-retries="$retries" --task-timeout=300s --project="$PROJECT_ID" --quiet
  for required in "$RC_SA_EMAIL" "$RC_SQL_CONNECTION_NAME" "$RC_DATABASE_SECRET" "$RC_SESSION_SECRET" "$RC_DEMO_PASSWORD_SECRET"; do gcloud run jobs describe "$job" --project="$PROJECT_ID" --region="$REGION" --format=export | grep -Fq "$required"; done
done
gcloud run jobs execute "$RC_MIGRATE_JOB_NAME" --project="$PROJECT_ID" --region="$REGION" --wait --quiet
gcloud run jobs execute "$RC_SEED_JOB_NAME" --project="$PROJECT_ID" --region="$REGION" --wait --quiet
```

## 7. Deploy and verify the isolated service — **creates Cloud Run revision / request billing**

```bash
gcloud run deploy "$RC_SERVICE_NAME" --image="$RC_IMAGE_DIGEST" --region="$REGION" --allow-unauthenticated --service-account="$RC_SA_EMAIL" --add-cloudsql-instances="$RC_SQL_CONNECTION_NAME" --set-secrets="$RC_SECRETS" --set-env-vars="$RC_ENV" --min-instances=0 --max-instances=1 --memory=512Mi --cpu=1 --port=3000 --project="$PROJECT_ID" --quiet
for required in "$RC_SA_EMAIL" "$RC_SQL_CONNECTION_NAME" "$RC_DATABASE_SECRET" "$RC_SESSION_SECRET" "$RC_DEMO_PASSWORD_SECRET"; do gcloud run services describe "$RC_SERVICE_NAME" --project="$PROJECT_ID" --region="$REGION" --format=export | grep -Fq "$required"; done
export RC_SERVICE_URL="$(gcloud run services describe "$RC_SERVICE_NAME" --project="$PROJECT_ID" --region="$REGION" --format='value(status.url)')"
curl --fail --silent --show-error "$RC_SERVICE_URL/api/health" | grep -Fq "${RC_SOURCE_COMMIT}"
curl --fail --silent --show-error "$RC_SERVICE_URL/api/ready" | grep -Fq '"status":"ready"'
```

Run `EXPECTED_COMMIT_SHA="$RC_SOURCE_COMMIT" SMOKE_EMAIL='pm1@example.com' SMOKE_PASSWORD='<read privately>' python3 deploy/smoke_test.py "$RC_SERVICE_URL"` only after obtaining the RC demo password through an approved private path. Never write it into the shell history or evidence.

## 8. Cleanup after UAT — **destructive, RC-only**

Before cleanup, retain only redacted URL, commit, digest, revision, traffic, and test evidence. Re-run the protected-name loop from step 1, then:

```bash
gcloud run services delete "$RC_SERVICE_NAME" --project="$PROJECT_ID" --region="$REGION" --quiet
gcloud run jobs delete "$RC_MIGRATE_JOB_NAME" --project="$PROJECT_ID" --region="$REGION" --quiet
gcloud run jobs delete "$RC_SEED_JOB_NAME" --project="$PROJECT_ID" --region="$REGION" --quiet
gcloud sql instances delete "$RC_SQL_INSTANCE" --project="$PROJECT_ID" --quiet
for secret in "$RC_DATABASE_SECRET" "$RC_SESSION_SECRET" "$RC_DEMO_PASSWORD_SECRET"; do gcloud secrets delete "$secret" --project="$PROJECT_ID" --quiet; done
gcloud iam service-accounts delete "$RC_SA_EMAIL" --project="$PROJECT_ID" --quiet
```

Do not delete the shared Artifact Registry repository or an image until evidence-retention is approved; then delete only `RC_IMAGE_DIGEST`.
