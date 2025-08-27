#!/usr/bin/env bash
set -euo pipefail

# Starts rigctld with common defaults if not already running, then runs rigboss dev

RIGCTLD_HOST=${RIGCTLD_HOST:-localhost}
RIGCTLD_PORT=${RIGCTLD_PORT:-4532}

if ! pgrep -x rigctld >/dev/null 2>&1; then
  echo "Starting rigctld (IC-7300 example). Adjust -r and -s as needed."
  rigctld -m 229 -r /dev/ttyUSB0 -s 115200 &
  sleep 1
fi

npm run dev

