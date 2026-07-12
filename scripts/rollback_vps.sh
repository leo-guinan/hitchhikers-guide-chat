#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: TARGET_ENV=production|staging $0 <release-output-dir-or-backup-tgz>" >&2
  echo "Examples:" >&2
  echo "  TARGET_ENV=staging $0 \"\$RELEASE_OUTPUT\"" >&2
  echo "  $0 \"\$BACKUP_TGZ\"" >&2
  exit 2
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

TARGET_ENV="${TARGET_ENV:-production}"
APP_NAME="${APP_NAME:-hitchhikers-guide-chat}"
VPS_HOST="${VPS_HOST:-arc-vps}"
case "$TARGET_ENV" in
  production)
    SERVICE="${SERVICE:-hitchhikers-guide-chat.service}"
    APP_DIR="${APP_DIR:-/opt/hitchhikers-guide-chat}"
    ;;
  staging)
    SERVICE="${SERVICE:-hitchhikers-guide-chat-staging.service}"
    APP_DIR="${APP_DIR:-/opt/hitchhikers-guide-chat-staging}"
    ;;
  *)
    echo "Unknown TARGET_ENV: $TARGET_ENV" >&2
    exit 2
    ;;
esac
TARGET="$1"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RECEIPT_DIR="$ROOT_DIR/deploy-receipts"
RECEIPT_PATH="$RECEIPT_DIR/$STAMP.$TARGET_ENV.rollback.json"
mkdir -p "$RECEIPT_DIR"

echo "== rollback: select $TARGET =="
ssh "$VPS_HOST" "APP_DIR='$APP_DIR' TARGET='$TARGET' STAMP='$STAMP' SERVICE='$SERVICE' bash -s" <<'REMOTE'
set -euo pipefail
if [ -f "$TARGET" ]; then
  RELEASE_OUTPUT="$APP_DIR/releases/rollback-$STAMP/output"
  RELEASE_ROOT="$(dirname "$RELEASE_OUTPUT")"
  rm -rf "$RELEASE_ROOT"
  mkdir -p "$RELEASE_ROOT"
  tar -C "$RELEASE_ROOT" -xzf "$TARGET"
  if [ ! -d "$RELEASE_ROOT/output" ]; then
    found="$(find "$RELEASE_ROOT" -maxdepth 2 -type f -name index.mjs -print -quit)"
    test -n "$found"
    mv "$(dirname "$found")" "$RELEASE_OUTPUT"
  fi
elif [ -d "$TARGET" ] && [ -f "$TARGET/index.mjs" ]; then
  RELEASE_OUTPUT="$TARGET"
elif [ -d "$TARGET/output" ] && [ -f "$TARGET/output/index.mjs" ]; then
  RELEASE_OUTPUT="$TARGET/output"
else
  echo 'Rollback target is neither an output dir nor a backup tarball' >&2
  exit 1
fi

cd "$RELEASE_OUTPUT"
npm install --omit=dev --no-audit --no-fund
ln -sfn "$RELEASE_OUTPUT" "$APP_DIR/current.next"
mv -Tf "$APP_DIR/current.next" "$APP_DIR/current"
systemctl restart "$SERVICE"
sleep 2
test "$(systemctl is-active "$SERVICE")" = active
REMOTE
TARGET_ENV="$TARGET_ENV" ./scripts/verify_prod.sh
REMOTE_PID="$(ssh "$VPS_HOST" "systemctl show -p MainPID --value '$SERVICE'")"
CURRENT_TARGET="$(ssh "$VPS_HOST" "readlink -f '$APP_DIR/current'")"
python3 - "$RECEIPT_PATH" <<PY
import json, sys
receipt = {
  'status': 'success',
  'kind': 'rollback',
  'target_env': '$TARGET_ENV',
  'app': '$APP_NAME',
  'service': '$SERVICE',
  'app_dir': '$APP_DIR',
  'target': '$TARGET',
  'current_target': '$CURRENT_TARGET',
  'timestamp_utc': '$STAMP',
  'remote_pid': '$REMOTE_PID',
}
with open(sys.argv[1], 'w') as f:
    json.dump(receipt, f, indent=2)
    f.write('\\n')
PY

echo "ROLLBACK_PASS $APP_NAME env=$TARGET_ENV receipt=$RECEIPT_PATH current=$CURRENT_TARGET pid=$REMOTE_PID"
