#!/usr/bin/env bash
set -euo pipefail

: "${PROJECT_ID:?Required}" "${REGION:?Required}" "${IMAGE_TAG:?Required}"
SERVICE_NAME="${SERVICE_NAME:-habit-tracker}"
MIGRATE_JOB_NAME="${MIGRATE_JOB_NAME:-habit-tracker-migrate}"
ROLLBACK="${ROLLBACK:-false}"

[[ "$IMAGE_TAG" =~ ^[0-9a-f]{40}$ ]] || { echo 'Invalid image tag.' >&2; exit 1; }
[[ "$ROLLBACK" == true || "$ROLLBACK" == false ]] || { echo 'Invalid rollback mode.' >&2; exit 1; }

IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/habit-tracker/habit-tracker:$IMAGE_TAG"
DIGEST_IMAGE="$(gcloud artifacts docker images describe "$IMAGE" --project="$PROJECT_ID" --format='value(image_summary.fully_qualified_digest)')"
[[ "$DIGEST_IMAGE" == "$REGION-docker.pkg.dev/$PROJECT_ID/habit-tracker/habit-tracker@sha256:"* ]] || {
  echo 'Image digest not found.' >&2
  exit 1
}

if [[ "$ROLLBACK" == false ]]; then
  gcloud run jobs update "$MIGRATE_JOB_NAME" \
    --image="$DIGEST_IMAGE" --project="$PROJECT_ID" --region="$REGION" --quiet
  gcloud run jobs execute "$MIGRATE_JOB_NAME" \
    --wait --project="$PROJECT_ID" --region="$REGION" --quiet
else
  echo 'Rollback: reuse existing image; skip migration and seed.'
fi

gcloud run services update "$SERVICE_NAME" \
  --image="$DIGEST_IMAGE" --project="$PROJECT_ID" --region="$REGION" --quiet
gcloud run services update-traffic "$SERVICE_NAME" \
  --to-latest --project="$PROJECT_ID" --region="$REGION" --quiet

SERVICE_URL="$(gcloud run services describe "$SERVICE_NAME" \
  --project="$PROJECT_ID" --region="$REGION" --format='value(status.url)')"
echo "Service URL: $SERVICE_URL"

if [[ -n "${GITHUB_ENV:-}" ]]; then
  printf 'SERVICE_URL=%s\nDEPLOYED_IMAGE=%s\n' "$SERVICE_URL" "$DIGEST_IMAGE" >> "$GITHUB_ENV"
fi
