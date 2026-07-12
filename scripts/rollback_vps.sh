#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <release-output-dir-or-backup-tgz>" >&2
  echo "Examples:" >&2
  echo "  $0 \"\$RELEASE_OUTPUT\"" >&2
  echo "  $0 \"\$BACKUP_TGZ\"" >&2
  exit 2
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

APP_NAME="${APP_NAME:-hitchhikers-guide-chat}"
VPS_HOST="${VPS_HOST:-arc-vps}"
SERVICE="${SERVICE:-hitchhikers-guide-chat.service}"
APP_DIR="${APP_DIR:-/opt/hitchhikers-guide-chat}"
TARGET="$1"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RECEIPT_DIR="$ROOT_DIR/deploy-receipts"
RECEIPT_PATH="$RECEIPT_DIR/$STAMP.rollback.json"
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
python3 - <<'PY'
import os
from pathlib import Path
app_dir = Path(os.environ['APP_DIR'])
unit = Path('/etc/systemd/system') / os.environ['SERVICE']
text = unit.read_text()
lines = []
for line in text.splitlines():
    if line.startswith('WorkingDirectory='):
        lines.append(f'WorkingDirectory={app_dir}/current')
    else:
        lines.append(line)
new = '\n'.join(lines) + '\n'
if new != text:
    unit.write_text(new)
PY
systemctl daemon-reload
systemctl restart "$SERVICE"
sleep 2
test "$(systemctl is-active "$SERVICE")" = active
REMOTE
./scripts/verify_prod.sh
REMOTE_PID="$(ssh "$VPS_HOST" "systemctl show -p MainPID --value '$SERVICE'")"
CURRENT_TARGET="$(ssh "$VPS_HOST" "readlink -f '$APP_DIR/current'")"
python3 - "$RECEIPT_PATH" <<PY
import json, sys
receipt = {
  'status': 'success',
  'kind': 'rollback',
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

echo "ROLLBACK_PASS $APP_NAME receipt=$RECEIPT_PATH current=$CURRENT_TARGET pid=$REMOTE_PID"
