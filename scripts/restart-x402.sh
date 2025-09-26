#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "[restart] Loading .env"
set +u
set -a; [ -f .env ] && source .env || true; set +a
set -u

LLM_BIN_DEFAULT="$ROOT_DIR/jolt-atlas/target/release/llm_prover"

if [ -z "${LLM_PROVER_BIN:-}" ]; then
  export LLM_PROVER_BIN="$LLM_BIN_DEFAULT"
fi

if [ ! -x "$LLM_PROVER_BIN" ]; then
  echo "[restart] Building jolt-atlas llm_prover (release)"
  (cd "$ROOT_DIR/jolt-atlas" && cargo build --release --bin llm_prover)
fi

if ! rg -n "^LLM_PROVER_BIN=" .env -S >/dev/null 2>&1; then
  echo "[restart] Writing LLM_PROVER_BIN to .env"
  printf "\nLLM_PROVER_BIN=%s\n" "$LLM_PROVER_BIN" >> .env
fi

echo "[restart] Stopping existing services (if any)"
set +e
PGPORT=${X402_ZKML_PORT:-8610}
if command -v lsof >/dev/null 2>&1; then
  BKPID=$(lsof -ti :8001 -sTCP:LISTEN 2>/dev/null); [ -n "$BKPID" ] && kill $BKPID 2>/dev/null || true
  PGPID=$(lsof -ti :${PGPORT} -sTCP:LISTEN 2>/dev/null); [ -n "$PGPID" ] && kill $PGPID 2>/dev/null || true
fi
[ -f .pid-rust-8001 ] && kill "$(cat .pid-rust-8001)" 2>/dev/null || true
[ -f .pid-proof-gate-8602 ] && kill "$(cat .pid-proof-gate-8602)" 2>/dev/null || true
pkill -f x402/proof-gate-server.js 2>/dev/null || true
pkill -f zkengine-rust-api 2>/dev/null || true
set -e

echo "[restart] Starting proof-gate (${PGPORT})"
setsid bash -lc 'set -a; [ -f .env ] && source .env || true; set +a; node x402/proof-gate-server.js' > logs-proof-gate-8602.log 2>&1 < /dev/null & echo $! > .pid-proof-gate-8602

echo "[restart] Waiting for proof-gate health on :${PGPORT}..."
for i in 1 2 3 4 5; do
  if curl -fsS http://127.0.0.1:${PGPORT}/health >/dev/null 2>&1; then echo "  ok"; break; fi; sleep 1; done

echo "[restart] Starting Rust backend (8001)"
setsid bash -lc 'set -a; [ -f .env ] && source .env || true; set +a; RUST_LOG=info cargo run' > logs-backend-8001.log 2>&1 < /dev/null & echo $! > .pid-rust-8001

echo "[restart] Waiting for backend test..."
for i in 1 2 3 4 5; do
  if curl -fsS http://127.0.0.1:8001/test >/dev/null 2>&1; then echo "  ok"; break; fi; sleep 1; done

echo "[restart] Status"
echo "- proof-gate pid: $(cat .pid-proof-gate-8602 2>/dev/null || echo n/a)"
echo "- rust backend pid: $(cat .pid-rust-8001 2>/dev/null || echo n/a)"

echo "[restart] Endpoints"
echo -n "- PG /health: "; curl -s http://127.0.0.1:${PGPORT}/health || true; echo
echo -n "- PG /ui/last-redemption: "; curl -s http://127.0.0.1:${PGPORT}/ui/last-redemption || true; echo
echo -n "- BE /test: "; curl -s http://127.0.0.1:8001/test || true; echo
echo -n "- BE /ui/last-redemption: "; curl -s http://127.0.0.1:8001/ui/last-redemption || true; echo

PORT_VAL=${PORT:-8001}
echo "[restart] Open: http://127.0.0.1:${PORT_VAL}/static/x402-demo.html"
