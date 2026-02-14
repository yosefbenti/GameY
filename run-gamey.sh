#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR"

./start-all.sh

if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "http://localhost:8000/admin" >/dev/null 2>&1 || true
fi
