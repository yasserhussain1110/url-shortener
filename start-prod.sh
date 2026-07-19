#!/bin/bash
set -euo pipefail

APP_HOME="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_HOME"

LOG_DIR="${LOG_DIR:-$APP_HOME/logs}"
JAR="build/libs/url-shortener-0.0.1-SNAPSHOT.jar"
PID_FILE="$LOG_DIR/app.pid"

mkdir -p "$LOG_DIR"

if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "Already running with PID $(cat "$PID_FILE")"
  exit 1
fi

# App logging (app.log / error.log, rotated) is handled by logback-spring.xml.
# bootstrap.log only captures pre-logging JVM output (e.g. OOM, crashes).
nohup java \
  -Dspring.profiles.active=prod \
  -DLOG_DIR="$LOG_DIR" \
  -jar "$JAR" \
  > "$LOG_DIR/bootstrap.log" 2>&1 &

echo $! > "$PID_FILE"
echo "Started PID $(cat "$PID_FILE") (logs in $LOG_DIR: app.log, error.log)"
