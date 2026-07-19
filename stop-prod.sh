#!/bin/bash
set -euo pipefail

APP_HOME="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="${LOG_DIR:-$APP_HOME/logs}"
PID_FILE="$LOG_DIR/app.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "No PID file at $PID_FILE; nothing to stop."
  exit 0
fi

PID="$(cat "$PID_FILE")"

if kill -0 "$PID" 2>/dev/null; then
  kill "$PID"
  # Wait up to 30s for a graceful shutdown, then force-kill.
  for _ in $(seq 1 30); do
    kill -0 "$PID" 2>/dev/null || break
    sleep 1
  done
  if kill -0 "$PID" 2>/dev/null; then
    echo "Graceful shutdown timed out; sending SIGKILL to $PID"
    kill -9 "$PID"
  fi
fi

rm -f "$PID_FILE"
echo "Stopped"
