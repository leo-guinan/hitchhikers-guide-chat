#!/usr/bin/env bash
set -euo pipefail

TARGET_ENV="${TARGET_ENV:-production}"
APP_NAME="${APP_NAME:-hitchhikers-guide-chat}"
VPS_HOST="${VPS_HOST:-arc-vps}"
SITE_ID="${SITE_ID:-LLFJJYXQ}"

case "$TARGET_ENV" in
  production)
    DOMAIN="${DOMAIN:-chat.hitchhikersguidetothefuture.com}"
    SERVICE="${SERVICE:-hitchhikers-guide-chat.service}"
    PORT="${PORT:-4142}"
    APP_DIR="${APP_DIR:-/opt/hitchhikers-guide-chat}"
    ;;
  staging)
    DOMAIN="${DOMAIN:-}"
    SERVICE="${SERVICE:-hitchhikers-guide-chat-staging.service}"
    PORT="${PORT:-4143}"
    APP_DIR="${APP_DIR:-/opt/hitchhikers-guide-chat-staging}"
    ;;
  *)
    echo "Unknown TARGET_ENV: $TARGET_ENV" >&2
    exit 2
    ;;
esac

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

fetch_page() {
  local path="$1"
  local out="$2"
  if [ -n "$DOMAIN" ]; then
    curl -fsSL "https://$DOMAIN$path" -o "$out"
  else
    ssh "$VPS_HOST" "curl -fsSL http://127.0.0.1:$PORT'$path'" > "$out"
  fi
}

check service_active ssh "$VPS_HOST" "test \"\$(systemctl is-active '$SERVICE')\" = active"
check loopback_health ssh "$VPS_HOST" "curl -fsS http://127.0.0.1:$PORT/healthz | grep -q '\"service\":\"$APP_NAME\"'"
check port_listening ssh "$VPS_HOST" "ss -tlnp | grep -q ':$PORT'"
check data_dir ssh "$VPS_HOST" "test -d '$APP_DIR/data' && test \"\$(find '$APP_DIR/data' -maxdepth 3 -type f | wc -l)\" -gt 0"
check env_file ssh "$VPS_HOST" "test -f '$APP_DIR/.env' && test \"\$(stat -c '%a' '$APP_DIR/.env')\" = 600"
check current_symlink ssh "$VPS_HOST" "test -L '$APP_DIR/current' && test -f '$APP_DIR/current/index.mjs'"
check service_cwd_current ssh "$VPS_HOST" "pid=\$(systemctl show -p MainPID --value '$SERVICE'); test \"\$(readlink -f /proc/\$pid/cwd)\" = \"\$(readlink -f '$APP_DIR/current')\""

fetch_page / "$TMP_DIR/home.html"
fetch_page /enter "$TMP_DIR/enter.html"
fetch_page /imports "$TMP_DIR/imports.html"
fetch_page /app "$TMP_DIR/app.html"
fetch_page /healthz "$TMP_DIR/healthz.json"

check http_health grep -q "\"service\":\"$APP_NAME\"" "$TMP_DIR/healthz.json"
check home_fathom grep -q "cdn.usefathom.com/script.js" "$TMP_DIR/home.html"
check home_site_id grep -q "data-site=\"$SITE_ID\"" "$TMP_DIR/home.html"
check enter_checkout_event grep -q "Guide Checkout Started" "$TMP_DIR/enter.html"
check enter_auth_event grep -q "Guide Sign In Code Requested" "$TMP_DIR/enter.html"
check app_chat_event grep -q "Guide Chat Sent" "$TMP_DIR/app.html"
check app_compress_event grep -q "Guide Diary Compressed" "$TMP_DIR/app.html"
check imports_fathom grep -q "data-site=\"$SITE_ID\"" "$TMP_DIR/imports.html"

if [ "$failures" -gt 0 ]; then
  echo "VERIFY_FAIL $APP_NAME env=$TARGET_ENV failures=$failures"
  exit 1
fi

echo "VERIFY_PASS $APP_NAME env=$TARGET_ENV domain=${DOMAIN:-loopback} service=$SERVICE port=$PORT"
