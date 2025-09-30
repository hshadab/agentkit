#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

stop_pid_file() {
  local file="$1"
  if [[ -f "$file" ]]; then
    local pid
    pid=$(cat "$file" || true)
    if [[ -n "${pid}" ]]; then
      echo "[demo-down] killing pid ${pid} from ${file}"
      kill "$pid" 2>/dev/null || true
    fi
    rm -f "$file"
  fi
}

stop_pid_file "$ROOT_DIR/.pid-proof-gate"
stop_pid_file "$ROOT_DIR/.pid-unified"
echo "[demo-down] done"

