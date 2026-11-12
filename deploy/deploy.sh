#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Habit and Activity Tracking System: first deployment to Google Cloud Run
# (Lab 5, Issue 5, Student Guide Episode 5). Adapted from the Lab 5 starter kit.
# ==============================================================================
# Usage (run from the REPO ROOT, in Cloud Shell):
#   DRY_RUN=1 PROJECT_ID=... REGION=... bash deploy/deploy.sh   # print the plan only
#   PROJECT_ID=... REGION=... bash deploy/deploy.sh             # deploy for real
#
# What it does (safe to re-run; existing resources and secrets are reused,
# never overwritten):
#   1 enable APIs        2 Artifact Registry    3 Cloud SQL (PostgreSQL 16)
#   4 database           5 runtime service account (Cloud SQL Client only)
#   6 DB user + secrets  7 build image          8 migrate job (every release)
#   9 seed job (first deployment only)          10 Cloud Run service
#
# Differences from the reference (TokTickIT) script:
#   - No Prisma. Migrations are plain SQL run by `node api/dist/src/db/migrate.js`.
#   - Secrets: DATABASE_URL, SESSION_SECRET, SEED_DEMO_PASSWORD (generated, never
#     typed or printed). There is no admin password; the demo accounts
#     pm1/alice/bob use SEED_DEMO_PASSWORD.
#   - Two jobs: `migrate` (safe, additive, run on every release) and `seed`
#     (run once, on the first deployment). A release must never re-seed.
#   - Image is tagged with the full git commit SHA when run inside a git clone.
# ==============================================================================

DRY_RUN="${DRY_RUN:-0}"
REGION="${REGION:-asia-southeast3}"

# Prints the command (DRY_RUN=1) or prints then runs it. Passwords are redacted.
run_cmd() {
  local arg
  if [ "$DRY_RUN" = "1" ]; then printf '[DRY_RUN] '; else printf '+ '; fi
  for arg in "$@"; do
    case "$arg" in
      --password=*) printf '%s ' '--password=<REDACTED>' ;;
      *) printf '%q ' "$arg" ;;
    esac
  done
  printf '\n'
  if [ "$DRY_RUN" != "1" ]; then "$@"; fi
}

if [ "$DRY_RUN" = "1" ]; then
  PROJECT_ID="${PROJECT_ID:-example-gcp-project}"
else
  PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null || true)}"
  if [ -z "$PROJECT_ID" ]; then
    echo "Error: PROJECT_ID is not set and no active gcloud project was found." >&2
    exit 1
  fi
fi

# ------------------------------------------------------------------------------
# Resource names. deploy.yml and release.sh (Issue 7) must use the same names.
# ------------------------------------------------------------------------------
REPO_NAME="habit-tracker"
SQL_INSTANCE="habit-tracker-pg"
DB_NAME="habit_tracker"
DB_USER="habit_tracker"
SERVICE_NAME="habit-tracker"
MIGRATE_JOB_NAME="habit-tracker-migrate"
SEED_JOB_NAME="habit-tracker-seed"
SA_NAME="habit-tracker-runner"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
SQL_CONN_NAME="${PROJECT_ID}:${REGION}:${SQL_INSTANCE}"

SECRET_DB_URL="habit-tracker-database-url"
SECRET_SESSION="habit-tracker-session-secret"
SECRET_DEMO_PASS="habit-tracker-demo-password"

# Non-secret settings (same names the app reads; see docs/labs/lab05/deployment.md).
APP_TIMEZONE_VALUE="Asia/Bangkok"
SESSION_TTL_VALUE="24"

# Image tag = full commit SHA (R-08). Falls back to "latest" outside a git clone.
if [ -z "${IMAGE_TAG:-}" ]; then
  IMAGE_TAG="$(git rev-parse HEAD 2>/dev/null || echo latest)"
fi
IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/${SERVICE_NAME}:${IMAGE_TAG}"

echo "=================================================================="
echo "Habit Tracker Cloud Run Deployment"
echo "Project : ${PROJECT_ID}"
echo "Region  : ${REGION}"
echo "Image   : ${IMAGE_URI}"
echo "Dry Run : ${DRY_RUN}"
echo "=================================================================="

# Helper: true when a command succeeds (always "false" in a dry run so the plan
# shows the create step).
exists() {
  if [ "$DRY_RUN" = "1" ]; then return 1; fi
  "$@" >/dev/null 2>&1
}

# ==============================================================================
# 1. Enable APIs
# ==============================================================================
run_cmd gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  iam.googleapis.com \
  --project "$PROJECT_ID"

# ==============================================================================
# 2. Artifact Registry repository (stores one image per commit SHA)
# ==============================================================================
if ! exists gcloud artifacts repositories describe "$REPO_NAME" --location "$REGION" --project "$PROJECT_ID"; then
  run_cmd gcloud artifacts repositories create "$REPO_NAME" \
    --repository-format=docker \
    --location "$REGION" \
    --description="Habit tracker container images" \
    --project "$PROJECT_ID"
fi

# ==============================================================================
# 3. Cloud SQL for PostgreSQL 16 (smallest tier, fixed 10 GB disk)
#    Billed every hour it exists. Pause or delete when nobody needs it.
#    --edition=enterprise is required for db-f1-micro on PostgreSQL 16.
# ==============================================================================
if ! exists gcloud sql instances describe "$SQL_INSTANCE" --project "$PROJECT_ID"; then
  run_cmd gcloud sql instances create "$SQL_INSTANCE" \
    --database-version=POSTGRES_16 \
    --edition=enterprise \
    --tier=db-f1-micro \
    --region="$REGION" \
    --storage-size=10GB \
    --storage-type=SSD \
    --no-storage-auto-increase \
    --backup-start-time=03:00 \
    --project "$PROJECT_ID"
fi

# ==============================================================================
# 4. Database
# ==============================================================================
if ! exists gcloud sql databases describe "$DB_NAME" --instance="$SQL_INSTANCE" --project "$PROJECT_ID"; then
  run_cmd gcloud sql databases create "$DB_NAME" --instance="$SQL_INSTANCE" --project "$PROJECT_ID"
fi

# ==============================================================================
# 5. Runtime service account: only Cloud SQL Client at project level.
#    Secret access is granted per secret in step 6, never project-wide.
# ==============================================================================
if ! exists gcloud iam service-accounts describe "$SA_EMAIL" --project "$PROJECT_ID"; then
  run_cmd gcloud iam service-accounts create "$SA_NAME" \
    --display-name="Habit tracker Cloud Run runtime" \
    --project "$PROJECT_ID"
fi
run_cmd gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/cloudsql.client" \
  --condition=None \
  --quiet

# ==============================================================================
# 6. DB user and secrets (generated here, stored only in Secret Manager).
#    A secret that already exists is never overwritten.
#    The password inside DATABASE_URL is the same value as the DB user's password.
#    The URL uses the Cloud SQL unix socket: pg reads host=/cloudsql/... from it.
# ==============================================================================
if ! exists gcloud secrets describe "$SECRET_DB_URL" --project "$PROJECT_ID"; then
  if [ "$DRY_RUN" = "1" ]; then
    run_cmd gcloud sql users create "$DB_USER" --instance="$SQL_INSTANCE" --password="<GENERATED_HEX_PASSWORD>" --project "$PROJECT_ID"
    run_cmd gcloud secrets create "$SECRET_DB_URL" --replication-policy=automatic --project "$PROJECT_ID"
    run_cmd gcloud secrets versions add "$SECRET_DB_URL" --data-file=- --project "$PROJECT_ID"
  else
    DB_PASS="$(openssl rand -hex 24)"
    if gcloud sql users list --instance="$SQL_INSTANCE" --project "$PROJECT_ID" --format="value(name)" | grep -qx "$DB_USER"; then
      run_cmd gcloud sql users set-password "$DB_USER" --instance="$SQL_INSTANCE" --password="$DB_PASS" --project "$PROJECT_ID"
    else
      run_cmd gcloud sql users create "$DB_USER" --instance="$SQL_INSTANCE" --password="$DB_PASS" --project "$PROJECT_ID"
    fi
    run_cmd gcloud secrets create "$SECRET_DB_URL" --replication-policy=automatic --project "$PROJECT_ID"
    printf "%s" "postgresql://${DB_USER}:${DB_PASS}@localhost/${DB_NAME}?host=/cloudsql/${SQL_CONN_NAME}" \
      | gcloud secrets versions add "$SECRET_DB_URL" --data-file=- --project "$PROJECT_ID"
    unset DB_PASS
  fi
fi

if ! exists gcloud secrets describe "$SECRET_SESSION" --project "$PROJECT_ID"; then
  run_cmd gcloud secrets create "$SECRET_SESSION" --replication-policy=automatic --project "$PROJECT_ID"
  if [ "$DRY_RUN" = "1" ]; then
    run_cmd gcloud secrets versions add "$SECRET_SESSION" --data-file=- --project "$PROJECT_ID"
  else
    openssl rand -hex 32 | tr -d '\n' | gcloud secrets versions add "$SECRET_SESSION" --data-file=- --project "$PROJECT_ID"
  fi
fi

if ! exists gcloud secrets describe "$SECRET_DEMO_PASS" --project "$PROJECT_ID"; then
  run_cmd gcloud secrets create "$SECRET_DEMO_PASS" --replication-policy=automatic --project "$PROJECT_ID"
  if [ "$DRY_RUN" = "1" ]; then
    run_cmd gcloud secrets versions add "$SECRET_DEMO_PASS" --data-file=- --project "$PROJECT_ID"
  else
    printf "%s" "$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-16)Aa1" \
      | gcloud secrets versions add "$SECRET_DEMO_PASS" --data-file=- --project "$PROJECT_ID"
  fi
fi

for secret in "$SECRET_DB_URL" "$SECRET_SESSION" "$SECRET_DEMO_PASS"; do
  run_cmd gcloud secrets add-iam-policy-binding "$secret" \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor" \
    --project "$PROJECT_ID" --quiet
done

# All three secrets are needed by every process: the app config requires them.
APP_SECRETS="DATABASE_URL=${SECRET_DB_URL}:latest,SESSION_SECRET=${SECRET_SESSION}:latest,SEED_DEMO_PASSWORD=${SECRET_DEMO_PASS}:latest"
APP_ENV_VARS="NODE_ENV=production,APP_ENV=production,APP_TIMEZONE=${APP_TIMEZONE_VALUE},SESSION_TTL=${SESSION_TTL_VALUE},GIT_COMMIT_SHA=${IMAGE_TAG}"

# ==============================================================================
# 7. Build and push the image with Cloud Build (root Dockerfile)
# ==============================================================================
run_cmd gcloud builds submit --tag "$IMAGE_URI" --project "$PROJECT_ID"

# ==============================================================================
# 8. Migration job (migrations only; additive and safe to run on every release).
#    If it fails the script stops BEFORE the service is deployed.
# ==============================================================================
run_cmd gcloud run jobs deploy "$MIGRATE_JOB_NAME" \
  --image "$IMAGE_URI" \
  --region "$REGION" \
  --service-account "$SA_EMAIL" \
  --set-cloudsql-instances "$SQL_CONN_NAME" \
  --set-secrets "$APP_SECRETS" \
  --set-env-vars "$APP_ENV_VARS" \
  --command "node" \
  --args "api/dist/src/db/migrate.js" \
  --max-retries 1 \
  --task-timeout 300s \
  --project "$PROJECT_ID"

job_failed() {
  printf '%s\n' "ERROR: Cloud Run job '$1' failed. Aborting before the service is deployed." >&2
  printf '%s\n' "Read its log with:" >&2
  printf '%s\n' "  gcloud logging read \"resource.type=cloud_run_job AND resource.labels.job_name=$1\" --project \"${PROJECT_ID}\" --limit 50 --format=\"value(textPayload)\"" >&2
  exit 1
}

if ! run_cmd gcloud run jobs execute "$MIGRATE_JOB_NAME" --region "$REGION" --wait --project "$PROJECT_ID"; then
  job_failed "$MIGRATE_JOB_NAME"
fi

# ==============================================================================
# 9. Seed job: demo accounts and templates. Runs ONLY on the first deployment
#    (when the job does not exist yet). Never run it on a release: it must not
#    touch data users or managers created later.
# ==============================================================================
if ! exists gcloud run jobs describe "$SEED_JOB_NAME" --region "$REGION" --project "$PROJECT_ID"; then
  run_cmd gcloud run jobs deploy "$SEED_JOB_NAME" \
    --image "$IMAGE_URI" \
    --region "$REGION" \
    --service-account "$SA_EMAIL" \
    --set-cloudsql-instances "$SQL_CONN_NAME" \
    --set-secrets "$APP_SECRETS" \
    --set-env-vars "$APP_ENV_VARS" \
    --command "node" \
    --args "api/dist/src/seed/seed.js" \
    --max-retries 0 \
    --task-timeout 300s \
    --project "$PROJECT_ID"
  if ! run_cmd gcloud run jobs execute "$SEED_JOB_NAME" --region "$REGION" --wait --project "$PROJECT_ID"; then
    job_failed "$SEED_JOB_NAME"
  fi
else
  echo "Seed job already exists: skipping seed (first deployment only)."
fi

# ==============================================================================
# 10. Cloud Run service (public URL, scale to zero, at most 3 instances)
#     --port must equal the port in the Dockerfile (3000).
# ==============================================================================
run_cmd gcloud run deploy "$SERVICE_NAME" \
  --image "$IMAGE_URI" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --service-account "$SA_EMAIL" \
  --add-cloudsql-instances "$SQL_CONN_NAME" \
  --set-secrets "$APP_SECRETS" \
  --set-env-vars "$APP_ENV_VARS" \
  --min-instances 0 \
  --max-instances 3 \
  --memory 512Mi \
  --cpu 1 \
  --port 3000 \
  --project "$PROJECT_ID"

if [ "$DRY_RUN" = "1" ]; then
  SERVICE_URL="https://${SERVICE_NAME}-<hash>-as.a.run.app"
else
  SERVICE_URL="$(gcloud run services describe "$SERVICE_NAME" --region "$REGION" --project "$PROJECT_ID" --format='value(status.url)')"
fi

printf '\n%s\n' "=================================================================="
printf '%s\n' "Deployment Completed!"
printf '%s\n' "Service URL    : ${SERVICE_URL}"
printf '%s\n' "Health Check   : ${SERVICE_URL}/api/health"
printf '%s\n' "Readiness Check: ${SERVICE_URL}/api/ready"
printf '%s\n' "Demo accounts  : pm1@example.com, alice@example.com, bob@example.com"
printf '%s\n' "Demo password  : stored in Secret Manager: ${SECRET_DEMO_PASS} (not printed)"
printf '%s\n' "Read it privately: gcloud secrets versions access latest --secret=${SECRET_DEMO_PASS}"
printf '%s\n' "=================================================================="
