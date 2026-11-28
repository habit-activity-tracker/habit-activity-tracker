#!/usr/bin/env bash
# Deploy an already-pushed immutable image to an isolated RC service only.
# This script deliberately has no defaults for service, job, project, or image.
set -euo pipefail

: "${PROJECT_ID:?Set the approved non-production project ID.}"
: "${REGION:?Set the approved RC region.}"
: "${RC_SERVICE_NAME:?Set the isolated RC Cloud Run service name.}"
: "${RC_MIGRATE_JOB_NAME:?Set the isolated RC migration job name.}"
: "${RC_SQL_INSTANCE:?Set the isolated RC Cloud SQL instance name.}"
: "${RC_DATABASE:?Set the isolated RC database name.}"
: "${RC_SERVICE_ACCOUNT:?Set the isolated RC runtime service-account email.}"
: "${RC_DATABASE_SECRET:?Set the RC-only DATABASE_URL secret name.}"
: "${RC_SESSION_SECRET:?Set the RC-only SESSION_SECRET secret name.}"
: "${RC_DEMO_PASSWORD_SECRET:?Set the RC-only SEED_DEMO_PASSWORD secret name.}"
: "${RC_IMAGE_DIGEST:?Set the immutable Artifact Registry image digest.}"
: "${GIT_COMMIT_SHA:?Set the full 40-character candidate commit SHA.}"
: "${CONFIRM_RC_TARGET:?Set exactly RC-ISOLATED after verifying service, job, database and secrets.}"

[[ "$CONFIRM_RC_TARGET" == 'RC-ISOLATED' ]] || { echo 'Refusing: CONFIRM_RC_TARGET must be RC-ISOLATED.' >&2; exit 2; }
[[ "$GIT_COMMIT_SHA" =~ ^[0-9a-f]{40}$ ]] || { echo 'Refusing: GIT_COMMIT_SHA must be a full 40-character SHA.' >&2; exit 2; }
[[ "$RC_IMAGE_DIGEST" == *@sha256:* ]] || { echo 'Refusing: RC_IMAGE_DIGEST must be an immutable digest.' >&2; exit 2; }

# Names must identify a deliberately isolated RC target. This makes an accidental
# invocation with a production resource name fail before any update or execution.
for value in "$RC_SERVICE_NAME" "$RC_MIGRATE_JOB_NAME" "$RC_SQL_INSTANCE" \
  "$RC_SERVICE_ACCOUNT" "$RC_DATABASE_SECRET" "$RC_SESSION_SECRET" "$RC_DEMO_PASSWORD_SECRET"; do
  [[ "$value" == habit-tracker-rc-* ]] || {
    echo "Refusing non-RC resource name: $value" >&2
    exit 2
  }
done
[[ "$RC_DATABASE" == habit_tracker_rc* ]] || {
  echo "Refusing non-RC database name: $RC_DATABASE" >&2
  exit 2
}

# Never permit the known production or retained restore-check names, even if an
# operator misconfigures an otherwise RC-looking input.
for forbidden in habit-tracker habit-tracker-migrate habit-tracker-pg habit-tracker-restore-check-20261127; do
  [[ "$RC_SERVICE_NAME" != "$forbidden" ]] || { echo "Refusing production service name: $forbidden" >&2; exit 2; }
  [[ "$RC_MIGRATE_JOB_NAME" != "$forbidden" ]] || { echo "Refusing production job name: $forbidden" >&2; exit 2; }
  [[ "$RC_SQL_INSTANCE" != "$forbidden" ]] || { echo "Refusing protected SQL instance name: $forbidden" >&2; exit 2; }
done

RC_SQL_CONNECTION_NAME="${PROJECT_ID}:${REGION}:${RC_SQL_INSTANCE}"
SERVICE_CONFIG="$(gcloud run services describe "$RC_SERVICE_NAME" --project="$PROJECT_ID" --region="$REGION" --format=export)"
JOB_CONFIG="$(gcloud run jobs describe "$RC_MIGRATE_JOB_NAME" --project="$PROJECT_ID" --region="$REGION" --format=export)"
gcloud sql instances describe "$RC_SQL_INSTANCE" --project="$PROJECT_ID" >/dev/null
gcloud sql databases describe "$RC_DATABASE" --instance="$RC_SQL_INSTANCE" --project="$PROJECT_ID" >/dev/null

# Inspect references only: --format=export contains service-account, Cloud SQL
# connection and Secret Manager *names*, never secret values. Both existing RC
# workloads must already reference the approved isolated dependencies.
for expected in "$RC_SERVICE_ACCOUNT" "$RC_SQL_CONNECTION_NAME" "$RC_DATABASE_SECRET" "$RC_SESSION_SECRET" "$RC_DEMO_PASSWORD_SECRET"; do
  grep -Fq -- "$expected" <<<"$SERVICE_CONFIG" || {
    echo "Refusing: RC service does not reference expected isolated dependency: $expected" >&2
    exit 2
  }
  grep -Fq -- "$expected" <<<"$JOB_CONFIG" || {
    echo "Refusing: RC migration job does not reference expected isolated dependency: $expected" >&2
    exit 2
  }
done

echo "Target verified: service=$RC_SERVICE_NAME job=$RC_MIGRATE_JOB_NAME sql=$RC_SQL_INSTANCE database=$RC_DATABASE project=$PROJECT_ID region=$REGION"
echo 'Executing migration only on the pre-verified RC job.'
gcloud run jobs update "$RC_MIGRATE_JOB_NAME" --image="$RC_IMAGE_DIGEST" --project="$PROJECT_ID" --region="$REGION" --quiet
gcloud run jobs execute "$RC_MIGRATE_JOB_NAME" --wait --project="$PROJECT_ID" --region="$REGION" --quiet

gcloud run services update "$RC_SERVICE_NAME" \
  --image="$RC_IMAGE_DIGEST" \
  --update-env-vars="GIT_COMMIT_SHA=$GIT_COMMIT_SHA" \
  --project="$PROJECT_ID" --region="$REGION" --quiet

RC_SERVICE_URL="$(gcloud run services describe "$RC_SERVICE_NAME" --project="$PROJECT_ID" --region="$REGION" --format='value(status.url)')"
RC_REVISION="$(gcloud run services describe "$RC_SERVICE_NAME" --project="$PROJECT_ID" --region="$REGION" --format='value(status.latestReadyRevisionName)')"
printf 'RC_SERVICE_URL=%s\nRC_REVISION=%s\nRC_IMAGE_DIGEST=%s\n' "$RC_SERVICE_URL" "$RC_REVISION" "$RC_IMAGE_DIGEST"
