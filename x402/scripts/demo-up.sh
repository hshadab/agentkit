#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "[demo-up] starting unified-backend (8002)"
node "$ROOT_DIR/../api/unified-backend.js" > "$ROOT_DIR/.unified.log" 2>&1 &
UNIFIED_PID=$!
echo $UNIFIED_PID > "$ROOT_DIR/.pid-unified"

echo "[demo-up] starting proof-gate (8610)"
node "$ROOT_DIR/proof-gate-server.js" > "$ROOT_DIR/.proof-gate.log" 2>&1 &
PROOF_PID=$!
echo $PROOF_PID > "$ROOT_DIR/.pid-proof-gate"

echo "[demo-up] services up"
echo "  unified-backend :8002 (pid $UNIFIED_PID)"
echo "  proof-gate      :8610 (pid $PROOF_PID)"
echo "Logs: $ROOT_DIR/.unified.log, $ROOT_DIR/.proof-gate.log"

echo "[demo-up] waiting for Ctrl-C to stop (or run scripts/demo-down.sh)"
trap 'echo; echo "[demo-up] stopping..."; kill $UNIFIED_PID $PROOF_PID 2>/dev/null || true; exit 0' INT TERM
while kill -0 $UNIFIED_PID 2>/dev/null && kill -0 $PROOF_PID 2>/dev/null; do sleep 1; done

