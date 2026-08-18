#!/usr/bin/env bash
# Sync local env vars into Google Secret Manager.
# Usage: ./scripts/sync-env-to-gsm.sh [env-file]   (default: .env.local)
#
# Creates a secret per variable (same name) or adds a new version when the
# value changed. Values identical to the latest version are skipped.
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-bookit-505917}"
ENV_FILE="${1:-.env.local}"
# Local-only variables that must not be uploaded (paths, machine-specific).
SKIP_KEYS=("GOOGLE_APPLICATION_CREDENTIALS")

[[ -f "$ENV_FILE" ]] || { echo "Env file not found: $ENV_FILE" >&2; exit 1; }

gcloud services enable secretmanager.googleapis.com --project "$PROJECT_ID" --quiet

should_skip() {
  local key="$1"
  for skip in "${SKIP_KEYS[@]}"; do
    [[ "$key" == "$skip" ]] && return 0
  done
  return 1
}

while IFS= read -r line || [[ -n "$line" ]]; do
  # Ignore comments and blank lines.
  [[ "$line" =~ ^[[:space:]]*# || -z "${line// /}" ]] && continue
  key="${line%%=*}"
  value="${line#*=}"
  # Strip optional surrounding quotes.
  value="${value%\"}" && value="${value#\"}"
  value="${value%\'}" && value="${value#\'}"

  if should_skip "$key"; then
    echo "skip    $key (local-only)"
    continue
  fi

  if gcloud secrets describe "$key" --project "$PROJECT_ID" >/dev/null 2>&1; then
    current="$(gcloud secrets versions access latest --secret "$key" --project "$PROJECT_ID" 2>/dev/null || true)"
    if [[ "$current" == "$value" ]]; then
      echo "ok      $key (unchanged)"
    else
      printf '%s' "$value" | gcloud secrets versions add "$key" --project "$PROJECT_ID" --data-file=- >/dev/null
      echo "update  $key (new version)"
    fi
  else
    printf '%s' "$value" | gcloud secrets create "$key" --project "$PROJECT_ID" --replication-policy automatic --data-file=- >/dev/null
    echo "create  $key"
  fi
done < "$ENV_FILE"

echo "Done. Secrets in project $PROJECT_ID are in sync with $ENV_FILE."
