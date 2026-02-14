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

# Start WebSocket coordinator on port 8000 with auto-restart
echo "Starting WebSocket coordinator on ws://localhost:8000 (auto-restart, logs -> coordinator.log)"
nohup npx nodemon --watch server.js --ext js server.js > coordinator.log 2>&1 &
COORD_PID=$!

# Start three simple static HTTP servers (one terminal per port)
# Admin: 8001, Team A: 8002, Team B: 8003
echo "Starting admin static server on http://0.0.0.0:8001 (logs -> admin.log)"
nohup python3 -m http.server 8001 --bind 0.0.0.0 > admin.log 2>&1 &
ADMIN_PID=$!

echo "Starting teamA static server on http://0.0.0.0:8002 (logs -> teamA.log)"
nohup python3 -m http.server 8002 --bind 0.0.0.0 > teamA.log 2>&1 &
TEAMA_PID=$!

echo "Starting teamB static server on http://0.0.0.0:8003 (logs -> teamB.log)"
nohup python3 -m http.server 8003 --bind 0.0.0.0 > teamB.log 2>&1 &
TEAMB_PID=$!

LAN_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
if [[ -z "${LAN_IP}" ]]; then
  LAN_IP="<SERVER_IP>"
fi

cat <<EOF
Started processes:
  coordinator pid: ${COORD_PID}
  admin pid:       ${ADMIN_PID}
  teamA pid:       ${TEAMA_PID}
  teamB pid:       ${TEAMB_PID}

Open in your browser:
  Admin -> http://localhost:8001/admin.html
  Team A -> http://localhost:8002/teamA.html
  Team B -> http://localhost:8003/teamB.html

From other computers on the same network:
  Admin -> http://${LAN_IP}:8001/admin.html
  Team A -> http://${LAN_IP}:8002/teamA.html
  Team B -> http://${LAN_IP}:8003/teamB.html

To stop them:
  kill ${COORD_PID} ${ADMIN_PID} ${TEAMA_PID} ${TEAMB_PID}
Logs saved to: coordinator.log admin.log teamA.log teamB.log
EOF
