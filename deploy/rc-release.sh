#!/usr/bin/env bash
# Deploy an already-pushed immutable image to an isolated RC service only.
# This script deliberately has no defaults for service, job, project, or image.
set -euo pipefail

: "${PROJECT_ID:?Set the approved non-production project ID.}"
: "${REGION:?Set the approved RC region.}"
: "${RC_SERVICE_NAME:?Set the isolated RC Cloud Run service name.}"
: "${RC_MIGRATE_JOB_NAME:?Set the isolated RC migration job name.}"
: "${RC_IMAGE_DIGEST:?Set the immutable Artifact Registry image digest.}"
: "${GIT_COMMIT_SHA:?Set the full 40-character candidate commit SHA.}"
: "${CONFIRM_RC_TARGET:?Set exactly RC-ISOLATED after verifying service, job, database and secrets.}"

[[ "$CONFIRM_RC_TARGET" == 'RC-ISOLATED' ]] || { echo 'Refusing: CONFIRM_RC_TARGET must be RC-ISOLATED.' >&2; exit 2; }
[[ "$GIT_COMMIT_SHA" =~ ^[0-9a-f]{40}$ ]] || { echo 'Refusing: GIT_COMMIT_SHA must be a full 40-character SHA.' >&2; exit 2; }
[[ "$RC_IMAGE_DIGEST" == *@sha256:* ]] || { echo 'Refusing: RC_IMAGE_DIGEST must be an immutable digest.' >&2; exit 2; }

# Never permit the known production names, even if an operator misconfigures input.
for forbidden in habit-tracker habit-tracker-migrate habit-tracker-pg; do
  [[ "$RC_SERVICE_NAME" != "$forbidden" ]] || { echo "Refusing production service name: $forbidden" >&2; exit 2; }
  [[ "$RC_MIGRATE_JOB_NAME" != "$forbidden" ]] || { echo "Refusing production job name: $forbidden" >&2; exit 2; }
done

gcloud run services describe "$RC_SERVICE_NAME" --project="$PROJECT_ID" --region="$REGION" >/dev/null
gcloud run jobs describe "$RC_MIGRATE_JOB_NAME" --project="$PROJECT_ID" --region="$REGION" >/dev/null

echo "Target verified: service=$RC_SERVICE_NAME job=$RC_MIGRATE_JOB_NAME project=$PROJECT_ID region=$REGION"
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
