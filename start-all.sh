#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

echo "Stopping existing processes (if any)..."
pkill -f "server.js" >/dev/null 2>&1 || true
pkill -f "python3 -m http.server 8001" >/dev/null 2>&1 || true
pkill -f "python3 -m http.server 8002" >/dev/null 2>&1 || true
pkill -f "python3 -m http.server 8003" >/dev/null 2>&1 || true

echo "Installing npm dependencies (if needed)..."
npm install --no-audit --no-fund

# Start unified app server (serves UI + WebSocket + uploads) on port 8000
echo "Starting unified game server on http://localhost:8000 (auto-restart, logs -> coordinator.log)"
nohup npx nodemon --watch server.js --ext js server.js > coordinator.log 2>&1 &
COORD_PID=$!

LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
if [[ -z "${LAN_IP}" ]]; then
  LAN_IP="<SERVER_IP>"
fi

cat <<EOF
Started processes:
  unified server pid: ${COORD_PID}

Open in your browser:
  Admin -> http://localhost:8000/admin
  Team A -> http://localhost:8000/teamA
  Team B -> http://localhost:8000/teamB

From other computers on the same network:
  Admin -> http://${LAN_IP}:8000/admin
  Team A -> http://${LAN_IP}:8000/teamA
  Team B -> http://${LAN_IP}:8000/teamB

To stop them:
  kill ${COORD_PID}
Logs saved to: coordinator.log
EOF
