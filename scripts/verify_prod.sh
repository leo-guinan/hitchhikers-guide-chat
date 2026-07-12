#!/usr/bin/env bash
set -euo pipefail

APP_NAME="${APP_NAME:-hitchhikers-guide-chat}"
DOMAIN="${DOMAIN:-chat.hitchhikersguidetothefuture.com}"
VPS_HOST="${VPS_HOST:-arc-vps}"
SERVICE="${SERVICE:-hitchhikers-guide-chat.service}"
PORT="${PORT:-4142}"
APP_DIR="${APP_DIR:-/opt/hitchhikers-guide-chat}"
SITE_ID="${SITE_ID:-LLFJJYXQ}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
failures=0

check() {
  local name="$1"
  shift
  if "$@" >"$TMP_DIR/$name.out" 2>"$TMP_DIR/$name.err"; then
    echo "PASS $name"
  else
    failures=$((failures+1))
    echo "FAIL $name"
    sed -n '1,20p' "$TMP_DIR/$name.err" >&2 || true
    sed -n '1,20p' "$TMP_DIR/$name.out" >&2 || true
  fi
}

check service_active ssh "$VPS_HOST" "test \"\$(systemctl is-active '$SERVICE')\" = active"
check loopback_health ssh "$VPS_HOST" "curl -fsS http://127.0.0.1:$PORT/healthz | grep -q '\"service\":\"$APP_NAME\"'"
check port_listening ssh "$VPS_HOST" "ss -tlnp | grep -q ':$PORT'"
check data_dir ssh "$VPS_HOST" "test -d '$APP_DIR/data' && test \"\$(find '$APP_DIR/data' -maxdepth 2 -type f | wc -l)\" -gt 0"
check env_file ssh "$VPS_HOST" "test -f '$APP_DIR/.env' && test \"\$(stat -c '%a' '$APP_DIR/.env')\" = 600"

curl -fsSL "https://$DOMAIN/" -o "$TMP_DIR/home.html"
curl -fsSL "https://$DOMAIN/enter" -o "$TMP_DIR/enter.html"
curl -fsSL "https://$DOMAIN/imports" -o "$TMP_DIR/imports.html"
curl -fsSL "https://$DOMAIN/app" -o "$TMP_DIR/app.html"
curl -fsSL "https://$DOMAIN/healthz" -o "$TMP_DIR/healthz.json"

check public_health grep -q "\"service\":\"$APP_NAME\"" "$TMP_DIR/healthz.json"
check public_home_fathom grep -q "cdn.usefathom.com/script.js" "$TMP_DIR/home.html"
check public_home_site_id grep -q "data-site=\"$SITE_ID\"" "$TMP_DIR/home.html"
check public_enter_checkout_event grep -q "Guide Checkout Started" "$TMP_DIR/enter.html"
check public_enter_auth_event grep -q "Guide Sign In Code Requested" "$TMP_DIR/enter.html"
check public_app_chat_event grep -q "Guide Chat Sent" "$TMP_DIR/app.html"
check public_app_compress_event grep -q "Guide Diary Compressed" "$TMP_DIR/app.html"
check public_imports_fathom grep -q "data-site=\"$SITE_ID\"" "$TMP_DIR/imports.html"

if [ "$failures" -gt 0 ]; then
  echo "VERIFY_PROD_FAIL $APP_NAME failures=$failures"
  exit 1
fi

echo "VERIFY_PROD_PASS $APP_NAME domain=$DOMAIN service=$SERVICE port=$PORT"
