#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

APP_NAME="${APP_NAME:-hitchhikers-guide-chat}"
DOMAIN="${DOMAIN:-chat.hitchhikersguidetothefuture.com}"
VPS_HOST="${VPS_HOST:-arc-vps}"
SERVICE="${SERVICE:-hitchhikers-guide-chat.service}"
PORT="${PORT:-4142}"
APP_DIR="${APP_DIR:-/opt/hitchhikers-guide-chat}"
ALLOW_DIRTY="${ALLOW_DIRTY:-0}"
RECEIPT_DIR="$ROOT_DIR/deploy-receipts"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RECEIPT_PATH="$RECEIPT_DIR/$STAMP.deploy.json"

for arg in "$@"; do
  case "$arg" in
    --allow-dirty) ALLOW_DIRTY=1 ;;
    *) echo "Unknown arg: $arg" >&2; exit 2 ;;
  esac
done

mkdir -p "$RECEIPT_DIR"

BRANCH="$(git branch --show-current 2>/dev/null || echo unknown)"
COMMIT="$(git rev-parse HEAD 2>/dev/null || echo unknown)"
STATUS_SHORT="$(git status --short)"
DIRTY_HASH="clean"
if [ -n "$STATUS_SHORT" ]; then
  DIRTY_TMP="$(mktemp)"
  git diff --binary > "$DIRTY_TMP"
  while IFS= read -r -d '' file; do
    printf '%s\n' "--- untracked $file ---" >> "$DIRTY_TMP"
    cat "$file" >> "$DIRTY_TMP"
    printf '\n' >> "$DIRTY_TMP"
  done < <(git ls-files --others --exclude-standard -z)
  DIRTY_HASH="$(shasum -a 256 "$DIRTY_TMP" | awk '{print $1}')"
  rm -f "$DIRTY_TMP"
  if [ "$ALLOW_DIRTY" != "1" ]; then
    echo "Refusing to deploy dirty tree. Commit changes or rerun with --allow-dirty." >&2
    git status --short >&2
    exit 1
  fi
fi

LOCAL_CI_STATUS="not_run"
BACKUP_PATH=""
REMOTE_PID=""
VERIFY_STATUS="not_run"

write_receipt() {
  local status="$1"
  export RECEIPT_STATUS="$status" LOCAL_CI_STATUS VERIFY_STATUS BACKUP_PATH REMOTE_PID
  python3 - "$RECEIPT_PATH" <<'PY'
import json, os, sys
path = sys.argv[1]
receipt = {
  'status': os.environ.get('RECEIPT_STATUS'),
  'app': os.environ.get('APP_NAME'),
  'domain': os.environ.get('DOMAIN'),
  'vps_host': os.environ.get('VPS_HOST'),
  'service': os.environ.get('SERVICE'),
  'port': int(os.environ.get('PORT', '0')),
  'app_dir': os.environ.get('APP_DIR'),
  'timestamp_utc': os.environ.get('STAMP'),
  'git': {
    'branch': os.environ.get('BRANCH'),
    'commit': os.environ.get('COMMIT'),
    'dirty': os.environ.get('STATUS_SHORT') != '',
    'dirty_hash': os.environ.get('DIRTY_HASH'),
    'status_short': os.environ.get('STATUS_SHORT', '').splitlines(),
  },
  'checks': {
    'local_ci': os.environ.get('LOCAL_CI_STATUS'),
    'verify_prod': os.environ.get('VERIFY_STATUS'),
  },
  'backup_path': os.environ.get('BACKUP_PATH'),
  'remote_pid': os.environ.get('REMOTE_PID'),
}
with open(path, 'w') as f:
    json.dump(receipt, f, indent=2)
    f.write('\n')
print(path)
PY
}

export APP_NAME DOMAIN VPS_HOST SERVICE PORT APP_DIR STAMP BRANCH COMMIT STATUS_SHORT DIRTY_HASH
trap 'write_receipt failed >/dev/null || true' ERR

echo "== deploy: local CI =="
./scripts/local_ci.sh
LOCAL_CI_STATUS="pass"

BACKUP_PATH="$APP_DIR/.deploy-backups/output-$STAMP.tgz"
echo "== deploy: remote backup $BACKUP_PATH =="
ssh "$VPS_HOST" "set -euo pipefail; mkdir -p '$APP_DIR/.deploy-backups'; if [ -d '$APP_DIR/.mastra/output' ]; then tar -C '$APP_DIR/.mastra' -czf '$BACKUP_PATH' output; fi; test -f '$BACKUP_PATH'"

echo "== deploy: rsync build output =="
rsync -az --delete --exclude='node_modules/' "$ROOT_DIR/.mastra/output/" "$VPS_HOST:$APP_DIR/.mastra/output/"

echo "== deploy: install production deps and restart =="
ssh "$VPS_HOST" "set -euo pipefail; cd '$APP_DIR/.mastra/output'; npm install --omit=dev --no-audit --no-fund; systemctl restart '$SERVICE'; sleep 2; test \"\$(systemctl is-active '$SERVICE')\" = active"
REMOTE_PID="$(ssh "$VPS_HOST" "systemctl show -p MainPID --value '$SERVICE'")"

echo "== deploy: production verification =="
./scripts/verify_prod.sh
VERIFY_STATUS="pass"

write_receipt success >/dev/null

echo "DEPLOY_PASS $APP_NAME domain=$DOMAIN receipt=$RECEIPT_PATH backup=$BACKUP_PATH pid=$REMOTE_PID"
