#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 /opt/hitchhikers-guide-chat/.deploy-backups/output-<timestamp>.tgz" >&2
  exit 2
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

APP_NAME="${APP_NAME:-hitchhikers-guide-chat}"
VPS_HOST="${VPS_HOST:-arc-vps}"
SERVICE="${SERVICE:-hitchhikers-guide-chat.service}"
APP_DIR="${APP_DIR:-/opt/hitchhikers-guide-chat}"
BACKUP_TGZ="$1"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RECEIPT_DIR="$ROOT_DIR/deploy-receipts"
RECEIPT_PATH="$RECEIPT_DIR/$STAMP.rollback.json"
mkdir -p "$RECEIPT_DIR"

echo "== rollback: restore $BACKUP_TGZ =="
ssh "$VPS_HOST" "set -euo pipefail; test -f '$BACKUP_TGZ'; rm -rf '$APP_DIR/.mastra/output.rollback-prev'; if [ -d '$APP_DIR/.mastra/output' ]; then mv '$APP_DIR/.mastra/output' '$APP_DIR/.mastra/output.rollback-prev'; fi; mkdir -p '$APP_DIR/.mastra'; tar -C '$APP_DIR/.mastra' -xzf '$BACKUP_TGZ'; cd '$APP_DIR/.mastra/output'; npm install --omit=dev --no-audit --no-fund; systemctl restart '$SERVICE'; sleep 2; test \"\$(systemctl is-active '$SERVICE')\" = active"

./scripts/verify_prod.sh
REMOTE_PID="$(ssh "$VPS_HOST" "systemctl show -p MainPID --value '$SERVICE'")"
python3 - "$RECEIPT_PATH" <<PY
import json, sys
receipt = {
  'status': 'success',
  'kind': 'rollback',
  'app': '$APP_NAME',
  'service': '$SERVICE',
  'app_dir': '$APP_DIR',
  'backup_restored': '$BACKUP_TGZ',
  'timestamp_utc': '$STAMP',
  'remote_pid': '$REMOTE_PID',
}
with open(sys.argv[1], 'w') as f:
    json.dump(receipt, f, indent=2)
    f.write('\\n')
PY

echo "ROLLBACK_PASS $APP_NAME receipt=$RECEIPT_PATH pid=$REMOTE_PID"
