#!/usr/bin/env bash
set -euo pipefail

# Example only. This script does not authenticate and does not print tokens.
# Required env var:
#   API_BASE_URL, for example https://api.example.com/api/v1

if [[ -z "${API_BASE_URL:-}" ]]; then
  echo "Missing required env var: API_BASE_URL" >&2
  exit 1
fi

api_base="${API_BASE_URL%/}"
api_origin="${api_base%/api/v1}"

echo "Checking API health..."
curl -i "${api_base}/health"

echo
echo "Checking Swagger exposure expectation..."
echo "Production should return 404/403 or be protected by Access/WAF."
curl -i "${api_origin}/docs" || true

echo
echo "Checking auth login endpoint without credentials..."
echo "This must not return a successful login or stack trace."
curl -i "${api_base}/admin/auth/login" || true

