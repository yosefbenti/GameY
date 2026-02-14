#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
LAUNCHER_DIR="$HOME/.local/share/applications"
DESKTOP_DIR="$HOME/Desktop"
LAUNCHER_FILE="$LAUNCHER_DIR/gamey.desktop"
DESKTOP_FILE="$DESKTOP_DIR/GameY.desktop"

mkdir -p "$LAUNCHER_DIR"

chmod +x "$APP_DIR/start-all.sh" "$APP_DIR/run-gamey.sh"

cat > "$LAUNCHER_FILE" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=GameY
Comment=Start GameY server and open Admin page
Exec=$APP_DIR/run-gamey.sh
Path=$APP_DIR
Terminal=true
Icon=applications-games
Categories=Game;
EOF

chmod +x "$LAUNCHER_FILE"

if [[ -d "$DESKTOP_DIR" ]]; then
  cp "$LAUNCHER_FILE" "$DESKTOP_FILE"
  chmod +x "$DESKTOP_FILE"
fi

echo "Shortcut installed: $LAUNCHER_FILE"
if [[ -f "$DESKTOP_FILE" ]]; then
  echo "Desktop icon created: $DESKTOP_FILE"
  echo "If your desktop asks, mark it as 'Allow Launching'."
fi
