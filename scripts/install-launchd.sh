#!/usr/bin/env bash
# macOS launchd に常時起動ジョブを登録（ログイン時に HTTP サーバー自動起動）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PLIST_SRC="$ROOT/scripts/com.souda.complaint-support.plist"
PLIST_DEST="$HOME/Library/LaunchAgents/com.souda.complaint-support.plist"

mkdir -p "$HOME/Library/LaunchAgents"

# パスを実環境に合わせて生成
cat >"$PLIST_DEST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.souda.complaint-support</string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/bin/python3</string>
    <string>-m</string>
    <string>http.server</string>
    <string>8787</string>
    <string>--bind</string>
    <string>127.0.0.1</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$ROOT</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/tmp/complaint-support-server.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/complaint-support-server.log</string>
</dict>
</plist>
EOF

launchctl bootout "gui/$(id -u)/com.souda.complaint-support" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST_DEST"
launchctl enable "gui/$(id -u)/com.souda.complaint-support"
launchctl kickstart -k "gui/$(id -u)/com.souda.complaint-support"

echo "✅ launchd ジョブを登録しました"
echo "   ラベル: com.souda.complaint-support"
echo "   URL: http://localhost:8787/index.html"
echo "   解除: launchctl bootout gui/$(id -u)/com.souda.complaint-support"
