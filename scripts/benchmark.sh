#!/usr/bin/env bash
# benchmark.sh — Throughput test for the /events endpoint.
#
# Sends 5,000 events through the sync API and records measured req/s.
# Appends a timestamped result block to docs/benchmark-results.md so the
# "5,000+ events/day" spec claim is backed by a real, reproducible measurement
# rather than a config value.
#
# Uses k6 (https://k6.io) if available; falls back to a pure-bash parallel
# curl loop that requires no extra tooling.
#
# Usage: bash scripts/benchmark.sh [base_url]
# Example: bash scripts/benchmark.sh http://localhost:3000

set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
TOTAL_EVENTS=5000
CONCURRENT_USERS=10
EVENTS_PER_USER=$((TOTAL_EVENTS / CONCURRENT_USERS))
OUTPUT="docs/benchmark-results.md"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "TaskBunny event throughput benchmark"
echo "Target : ${TOTAL_EVENTS} events / ${CONCURRENT_USERS} virtual users"
echo "Server : ${BASE_URL}"
echo "Time   : ${TIMESTAMP}"
echo ""

# ---------------------------------------------------------------------------
# Auth — obtain a JWT for the seeded test user
# ---------------------------------------------------------------------------
TOKEN=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"testpassword","deviceId":"bench-device"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "ERROR: Could not obtain auth token. Run seed-events.sh first."
  exit 1
fi

# ---------------------------------------------------------------------------
# Run the test
# ---------------------------------------------------------------------------
if command -v k6 &>/dev/null; then
  echo "Backend: k6"
  echo ""

  K6_OUT=$(k6 run --quiet - <<K6SCRIPT 2>&1
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  vus: ${CONCURRENT_USERS},
  iterations: ${TOTAL_EVENTS},
};

const BASE  = '${BASE_URL}';
const TOKEN = '${TOKEN}';

export default function () {
  const payload = JSON.stringify({
    events: [{
      clientEventId: \`\${__VU}-\${__ITER}-\${Date.now()}\`,
      deviceId:  \`bench-\${__VU}\`,
      eventType: 'focus_session_tick',
      payload:   {},
      recordedAt: new Date().toISOString(),
      vectorClock: { [\`bench-\${__VU}\`]: __ITER },
    }],
  });

  const res = http.post(\`\${BASE}/events\`, payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: \`Bearer \${TOKEN}\`,
    },
  });

  check(res, { 'status 202': (r) => r.status === 202 });
}
K6SCRIPT
  )

  echo "$K6_OUT"

  # Extract key metrics from k6 summary output
  RPS=$(echo "$K6_OUT"    | grep -oP 'http_reqs[^0-9]*\K[0-9]+(?=/s)' | head -1 || echo "")
  MED=$(echo "$K6_OUT"    | grep -oP 'http_req_duration[^m]*med=\K[0-9.]+' | head -1 || echo "")
  CHECKS=$(echo "$K6_OUT" | grep -oP 'checks[^%]*\K[0-9.]+(?=%)' | head -1 || echo "")

  EVENTS_PER_DAY=$(awk -v rps="${RPS:-0}" 'BEGIN { printf "%d", rps * 86400 }')

  RESULT_BLOCK=$(cat <<RESULTEOF

## Throughput Benchmark — k6 (${TIMESTAMP})

| Metric | Value |
|---|---|
| Tool | k6 |
| Virtual users | ${CONCURRENT_USERS} |
| Total iterations | ${TOTAL_EVENTS} |
| Measured req/s | ${RPS:-N/A} |
| Median latency (ms) | ${MED:-N/A} |
| Check pass rate | ${CHECKS:-N/A}% |
| **Extrapolated events/day** | **${EVENTS_PER_DAY:-see raw output above}** |

Raw k6 output above. Run \`bash scripts/benchmark.sh\` to reproduce.
RESULTEOF
)

else
  # ------------------------------------------------------------------
  # Fallback: parallel curl workers (no external tool required)
  # ------------------------------------------------------------------
  echo "k6 not found — using parallel curl (${CONCURRENT_USERS} workers × ${EVENTS_PER_USER} requests)"
  echo ""

  TMPDIR_BENCH=$(mktemp -d /tmp/taskbunny-bench.XXXXXX)
  trap 'rm -rf "$TMPDIR_BENCH"' EXIT

  START_NS=$(date +%s%N)

  for VU in $(seq 1 "$CONCURRENT_USERS"); do
    (
      SUCCESSES=0
      for ITER in $(seq 1 "$EVENTS_PER_USER"); do
        PAYLOAD=$(cat <<PAYEOF
{"events":[{"clientEventId":"${VU}-${ITER}-$(date +%s%N)","deviceId":"bench-${VU}","eventType":"focus_session_tick","payload":{},"recordedAt":"$(date -u +%Y-%m-%dT%H:%M:%SZ)","vectorClock":{"bench-${VU}":${ITER}}}]}
PAYEOF
)
        STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/events" \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer ${TOKEN}" \
          -d "$PAYLOAD")
        [[ "$STATUS" == "202" ]] && SUCCESSES=$((SUCCESSES + 1))
      done
      echo "$SUCCESSES" > "${TMPDIR_BENCH}/vu_${VU}.txt"
    ) &
  done

  wait  # all VUs done

  END_NS=$(date +%s%N)
  ELAPSED_S=$(awk -v s="$START_NS" -v e="$END_NS" 'BEGIN { printf "%.3f", (e-s)/1e9 }')

  TOTAL_SUCCESS=0
  for f in "${TMPDIR_BENCH}"/vu_*.txt; do
    TOTAL_SUCCESS=$((TOTAL_SUCCESS + $(cat "$f")))
  done

  RPS=$(awk -v n="$TOTAL_SUCCESS" -v t="$ELAPSED_S" 'BEGIN { printf "%.1f", n/t }')
  EVENTS_PER_DAY=$(awk -v rps="$RPS" 'BEGIN { printf "%d", rps * 86400 }')

  echo "Completed: ${TOTAL_SUCCESS}/${TOTAL_EVENTS} requests accepted (202)"
  echo "Elapsed  : ${ELAPSED_S}s"
  echo "Rate     : ${RPS} req/s  →  ${EVENTS_PER_DAY} events/day (extrapolated)"

  RESULT_BLOCK=$(cat <<RESULTEOF

## Throughput Benchmark — curl (${TIMESTAMP})

| Metric | Value |
|---|---|
| Tool | parallel curl (bash) |
| Virtual users | ${CONCURRENT_USERS} |
| Total requests | ${TOTAL_EVENTS} |
| Accepted (202) | ${TOTAL_SUCCESS} |
| Elapsed (s) | ${ELAPSED_S} |
| Measured req/s | ${RPS} |
| **Extrapolated events/day** | **${EVENTS_PER_DAY}** |

Run \`bash scripts/benchmark.sh\` to reproduce.
RESULTEOF
)
fi

# ---------------------------------------------------------------------------
# Append results to benchmark-results.md
# ---------------------------------------------------------------------------
echo "$RESULT_BLOCK" >> "$OUTPUT"
echo ""
echo "Results appended to ${OUTPUT}"
