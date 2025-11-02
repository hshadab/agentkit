#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

usage() {
  cat <<'EOF'
Usage: scripts/clean.sh [options]

Options (combine as needed):
  --logs        Remove log files in ./logs and root *.log
  --pids        Remove PID files in ./run and legacy .pid-* in root
  --target      Remove Rust target/ directory
  --node        Remove node_modules/ (root) and erc8004-marketplace/node_modules
  --venv        Remove Python virtualenvs: venv/, .venv, Circle-OOAK/.venv
  --proofs      Remove proofs/ directory (large)
  --dry-run     Print actions without deleting

Examples:
  scripts/clean.sh --logs --pids
  scripts/clean.sh --target --node --venv
  scripts/clean.sh --proofs   # WARNING: very large
EOF
}

DRY_RUN=false
DO_LOGS=false
DO_PIDS=false
DO_TARGET=false
DO_NODE=false
DO_VENV=false
DO_PROOFS=false

for arg in "$@"; do
  case "$arg" in
    --logs) DO_LOGS=true ;;
    --pids) DO_PIDS=true ;;
    --target) DO_TARGET=true ;;
    --node) DO_NODE=true ;;
    --venv) DO_VENV=true ;;
    --proofs) DO_PROOFS=true ;;
    --dry-run) DRY_RUN=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; usage; exit 1 ;;
  esac
done

run() { if $DRY_RUN; then echo "+ $*"; else eval "$@"; fi; }

shopt -s nullglob

if $DO_LOGS; then
  echo "[clean] Logs"
  run "mkdir -p logs"
  for f in logs/*.log *.log logs-*.log; do run rm -v "$f"; done
fi

if $DO_PIDS; then
  echo "[clean] PIDs"
  run "mkdir -p run"
  for f in run/*.pid .pid-*; do run rm -v "$f"; done
fi

if $DO_TARGET; then
  echo "[clean] Rust target/"
  [ -d target ] && run rm -rf target || true
fi

if $DO_NODE; then
  echo "[clean] node_modules/"
  [ -d node_modules ] && run rm -rf node_modules || true
  [ -d erc8004-marketplace/node_modules ] && run rm -rf erc8004-marketplace/node_modules || true
fi

if $DO_VENV; then
  echo "[clean] Python virtualenvs"
  [ -d venv ] && run rm -rf venv || true
  [ -d .venv ] && run rm -rf .venv || true
  [ -d Circle-OOAK/.venv ] && run rm -rf Circle-OOAK/.venv || true
fi

if $DO_PROOFS; then
  echo "[clean] proofs/ (large)"
  [ -d proofs ] && run rm -rf proofs || true
fi

echo "[clean] Done"

