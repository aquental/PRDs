#!/usr/bin/env bash
# verify-warmup.sh — Starts the dev server and times HTTP response latency.
#
# Two-phase check:
#   1. "cold" — first-ever request per route (triggers dep-optimization if not cached)
#   2. "warm" — second request to the same route (must always be fast)
#
# The fix (optimizeDeps.include + server.warmup) ensures dep-optimization
# runs during server startup. After the first npm run dev following a
# package.json change, subsequent starts are fast from the first request.
#
# Usage: bash scripts/verify-warmup.sh

set -euo pipefail

LOG=$(mktemp)
PASS=true

cleanup() {
  kill "${SERVER_PID}" 2>/dev/null || true
  wait "${SERVER_PID}" 2>/dev/null || true
  rm -f "${LOG}"
}
trap cleanup EXIT

echo "▶  Starting dev server…"
PORT=5174 npm run dev >"${LOG}" 2>&1 &
SERVER_PID=$!

# Wait up to 20 s for Vite to print "Local:" then parse the actual port it bound to
for i in $(seq 1 40); do
  sleep 0.5
  grep -q "Local:" "${LOG}" 2>/dev/null && break
  if [ "${i}" -eq 40 ]; then
    echo "✘  Server did not start within 20 s"
    cat "${LOG}"
    exit 1
  fi
done

# Parse the URL Vite actually used (handles port conflicts gracefully)
ACTUAL_URL=$(grep "Local:" "${LOG}" | grep -oE 'http://[^ ]+' | head -1)
if [ -z "${ACTUAL_URL}" ]; then
  echo "✘  Could not determine server URL"
  cat "${LOG}"
  exit 1
fi
BASE="${ACTUAL_URL%/}"  # strip trailing slash

echo "✔  Server ready at ${BASE}."
echo "    Waiting 5 s for optimizeDeps pre-bundling to complete…"
sleep 5
echo ""

# ─── helpers ─────────────────────────────────────────────────────────────────

# time_request <path>  →  prints elapsed seconds to stdout (locale-safe)
time_request() {
  LC_ALL=C curl -s -o /dev/null \
    -w "%{time_total}" \
    --max-time 35 \
    "${BASE}${1}" 2>/dev/null
}

format_s() {
  # locale-safe float formatting via awk
  awk "BEGIN { printf \"%.2f\", ${1} }"
}

assert_fast() {
  local label="$1" elapsed="$2" threshold="$3"
  local ok rounded
  rounded=$(format_s "${elapsed}")
  ok=$(awk -v t="${elapsed}" -v th="${threshold}" 'BEGIN { print (t < th) ? "yes" : "no" }')
  if [ "${ok}" = "yes" ]; then
    echo "  ✔  ${label} — ${rounded}s  (< ${threshold}s)"
  else
    echo "  ✘  ${label} — ${rounded}s  EXCEEDED ${threshold}s"
    PASS=false
  fi
}

# ─── requests ──────────────────────────────────────────────────────────────────────
# The FIX guarantees:
#   Route 1 [cold]: may take up to ~25 s if dep-optimization cache is cold
#                   (only ever happens once per cache-invalidation cycle)
#   Route 2+ [cold]: must be fast (≤ 3 s) — KEY proof that deps are cached
#   Any warm request: must be fast (≤ 3 s)
echo "Cold requests (first ever visit — may trigger dep-optimization):"

T1=$(time_request "/")
assert_fast "GET /        [cold, 1st route]" "${T1}" 30  # dep-opt budget

T2=$(time_request "/login")
assert_fast "GET /login   [cold, 2nd route]" "${T2}" 3   # must be cached

echo ""
echo "Warm requests (repeat visits — always fast):"

T3=$(time_request "/")
assert_fast "GET /        [warm]" "${T3}" 3

T4=$(time_request "/login")
assert_fast "GET /login   [warm]" "${T4}" 3

echo ""

if [ "${PASS}" = "true" ]; then
  echo "✔  All checks passed."
  exit 0
else
  echo "✘  One or more checks failed — see output above."
  echo "Server log:"
  cat "${LOG}"
  exit 1
fi
