#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

TARGET_ENV="${TARGET_ENV:-production}"
APP_NAME="${APP_NAME:-hitchhikers-guide-chat}"
VPS_HOST="${VPS_HOST:-arc-vps}"
NODE_BIN="${NODE_BIN:-}"
ALLOW_DIRTY="${ALLOW_DIRTY:-0}"

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

RECEIPT_DIR="$ROOT_DIR/deploy-receipts"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RECEIPT_PATH="$RECEIPT_DIR/$STAMP.$TARGET_ENV.deploy.json"

for arg in "$@"; do
  case "$arg" in
    --allow-dirty) ALLOW_DIRTY=1 ;;
    *) echo "Unknown arg: $arg" >&2; exit 2 ;;
  esac
done

mkdir -p "$RECEIPT_DIR"

BRANCH="$(git branch --show-current 2>/dev/null || echo unknown)"
COMMIT="$(git rev-parse HEAD 2>/dev/null || echo unknown)"
COMMIT_SHORT="${COMMIT:0:12}"
RELEASE_ID="$STAMP-$COMMIT_SHORT"
RELEASE_DIR="$APP_DIR/releases/$RELEASE_ID"
RELEASE_OUTPUT="$RELEASE_DIR/output"
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
CURRENT_TARGET=""

write_receipt() {
  local status="$1"
  export RECEIPT_STATUS="$status" TARGET_ENV LOCAL_CI_STATUS VERIFY_STATUS BACKUP_PATH REMOTE_PID RELEASE_ID RELEASE_DIR RELEASE_OUTPUT CURRENT_TARGET
  python3 - "$RECEIPT_PATH" <<'PY'
import json, os, sys
path = sys.argv[1]
receipt = {
  'status': os.environ.get('RECEIPT_STATUS'),
  'target_env': os.environ.get('TARGET_ENV'),
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
  'release': {
    'id': os.environ.get('RELEASE_ID'),
    'dir': os.environ.get('RELEASE_DIR'),
    'output': os.environ.get('RELEASE_OUTPUT'),
    'current_target': os.environ.get('CURRENT_TARGET'),
  },
  'checks': {
    'local_ci': os.environ.get('LOCAL_CI_STATUS'),
    'verify': os.environ.get('VERIFY_STATUS'),
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

export TARGET_ENV APP_NAME DOMAIN VPS_HOST SERVICE PORT APP_DIR STAMP BRANCH COMMIT STATUS_SHORT DIRTY_HASH
trap 'write_receipt failed >/dev/null || true' ERR

echo "== deploy: local CI =="
./scripts/local_ci.sh
LOCAL_CI_STATUS="pass"

BACKUP_PATH="$APP_DIR/.deploy-backups/output-$STAMP.tgz"
echo "== deploy: bootstrap $TARGET_ENV service and backup current release =="
ssh "$VPS_HOST" "APP_DIR='$APP_DIR' SERVICE='$SERVICE' PORT='$PORT' NODE_BIN='$NODE_BIN' BACKUP_PATH='$BACKUP_PATH' bash -s" <<'REMOTE'
set -euo pipefail
if [ -z "$NODE_BIN" ]; then
  NODE_BIN="$(find /opt/hitchhikers-guide-chat -maxdepth 2 -path '*/bin/node' -type f | sort -V | tail -1)"
fi
test -x "$NODE_BIN"
mkdir -p "$APP_DIR/.deploy-backups" "$APP_DIR/releases" "$APP_DIR/data"
touch "$APP_DIR/data/.keep"
if [ ! -f "$APP_DIR/.env" ]; then
  : > "$APP_DIR/.env"
  chmod 600 "$APP_DIR/.env"
fi
chmod 600 "$APP_DIR/.env"
if [ -L "$APP_DIR/current" ]; then
  target="$(readlink -f "$APP_DIR/current")"
  tar -C "$(dirname "$target")" -czf "$BACKUP_PATH" "$(basename "$target")"
elif [ -d "$APP_DIR/.mastra/output" ]; then
  tar -C "$APP_DIR/.mastra" -czf "$BACKUP_PATH" output
fi
cat > "/etc/systemd/system/$SERVICE" <<EOF
[Unit]
Description=Hitchhikers Guide Chat Mastra endpoint ($SERVICE)
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$APP_DIR/current
Environment=NODE_ENV=production
Environment=PORT=$PORT
Environment=GUIDE_DATA_DIR=$APP_DIR/data
EnvironmentFile=-$APP_DIR/.env
ExecStart=$NODE_BIN --import=./instrumentation.mjs index.mjs
Restart=on-failure
RestartSec=5
TimeoutStopSec=10
KillMode=mixed

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable "$SERVICE" >/dev/null
REMOTE

echo "== deploy: create release $RELEASE_OUTPUT =="
ssh "$VPS_HOST" "set -euo pipefail; rm -rf '$RELEASE_DIR'; mkdir -p '$RELEASE_OUTPUT'"
rsync -az --delete --exclude='node_modules/' "$ROOT_DIR/.mastra/output/" "$VPS_HOST:$RELEASE_OUTPUT/"

echo "== deploy: install deps, switch current, restart =="
ssh "$VPS_HOST" "set -euo pipefail; cd '$RELEASE_OUTPUT'; npm install --omit=dev --no-audit --no-fund; ln -sfn '$RELEASE_OUTPUT' '$APP_DIR/current.next'; mv -Tf '$APP_DIR/current.next' '$APP_DIR/current'; systemctl restart '$SERVICE'; sleep 2; test \"\$(systemctl is-active '$SERVICE')\" = active"
REMOTE_PID="$(ssh "$VPS_HOST" "systemctl show -p MainPID --value '$SERVICE'")"
CURRENT_TARGET="$(ssh "$VPS_HOST" "readlink -f '$APP_DIR/current'")"

echo "== deploy: verification =="
TARGET_ENV="$TARGET_ENV" ./scripts/verify_prod.sh
VERIFY_STATUS="pass"

write_receipt success >/dev/null

echo "DEPLOY_PASS $APP_NAME env=$TARGET_ENV domain=${DOMAIN:-loopback} receipt=$RECEIPT_PATH release=$RELEASE_OUTPUT backup=${BACKUP_PATH:-none} pid=$REMOTE_PID"
