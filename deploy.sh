#!/usr/bin/env bash
# Deploy BookIt to Cloud Run.
# Prereqs: gcloud CLI authenticated (gcloud auth login) and the project set up once:
#   gcloud services enable run.googleapis.com cloudbuild.googleapis.com firestore.googleapis.com
#   gcloud firestore databases create --location=europe-west1   # first time only
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-bookit-505917}"
REGION="${GCP_REGION:-europe-west1}"
SERVICE="bookit"

: "${APP_PASSWORD:?Set APP_PASSWORD env var before deploying}"
: "${SESSION_SECRET:?Set SESSION_SECRET env var before deploying (e.g. openssl rand -hex 32)}"

gcloud run deploy "$SERVICE" \
  --source . \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 2 \
  --memory 512Mi \
  --set-env-vars "APP_PASSWORD=${APP_PASSWORD},SESSION_SECRET=${SESSION_SECRET}"

echo "Deployed. URL:"
gcloud run services describe "$SERVICE" --project "$PROJECT_ID" --region "$REGION" --format 'value(status.url)'
