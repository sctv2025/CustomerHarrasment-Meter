#!/usr/bin/env bash
# 利用者苦情対応の支援・教育ソフト — 常時配信用ローカルサーバー
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-8787}"
PIDFILE="${PIDFILE:-/tmp/complaint-support-server.pid}"
LOGFILE="${LOGFILE:-/tmp/complaint-support-server.log}"

cd "$ROOT"

if lsof -i ":$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "✅ サーバーは既にポート $PORT で稼働中です"
  echo "   URL: http://localhost:$PORT/index.html"
  exit 0
fi

nohup python3 -m http.server "$PORT" --bind 127.0.0.1 >>"$LOGFILE" 2>&1 &
echo $! >"$PIDFILE"

sleep 0.5
if lsof -i ":$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "✅ サーバーを起動しました（PID $(cat "$PIDFILE")）"
  echo "   URL: http://localhost:$PORT/index.html"
  echo "   ログ: $LOGFILE"
else
  echo "❌ 起動に失敗しました。ログ: $LOGFILE" >&2
  exit 1
fi
