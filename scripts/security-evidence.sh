#!/usr/bin/env bash
# Produces the before-and-after evidence for the Milestone 2 security control.
#
# It fires repeated wrong-password logins at a running server and prints the
# HTTP status of each attempt.
#
#   BEFORE the control: every attempt answers 401 -- unlimited guessing.
#   AFTER  the control: the first few answer 401, then 429 Too Many Requests.
#
# Usage:
#   ./scripts/security-evidence.sh                      # defaults to localhost:3001
#   BASE_URL=http://localhost:3001 ATTEMPTS=8 ./scripts/security-evidence.sh
#
# Capture the output with:
#   ./scripts/security-evidence.sh | tee docs/milestone-2/evidence/rate-limit-after.txt
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3001}"
EMAIL="${EMAIL:-demo@replog.test}"
ATTEMPTS="${ATTEMPTS:-8}"

echo "Target:   $BASE_URL/api/auth/login"
echo "Account:  $EMAIL"
echo "Attempts: $ATTEMPTS (all with a deliberately wrong password)"
echo "Run at:   $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo
printf '%-9s %-7s %s\n' "ATTEMPT" "STATUS" "MEANING"
printf '%-9s %-7s %s\n' "-------" "------" "-------"

for i in $(seq 1 "$ATTEMPTS"); do
  status=$(curl -s -o /dev/null -w '%{http_code}' \
    -X POST "$BASE_URL/api/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$EMAIL\",\"password\":\"definitely-wrong-$i\"}")

  case "$status" in
    401) meaning="rejected, but the guess was answered" ;;
    429) meaning="BLOCKED by rate limit" ;;
    000) meaning="no response -- is the server running?" ;;
    *)   meaning="unexpected" ;;
  esac
  printf '%-9s %-7s %s\n' "$i" "$status" "$meaning"
done

echo
echo "Expected before the control: every attempt 401."
echo "Expected after  the control: 401 up to the limit, then 429."
