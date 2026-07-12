# Deployment

Operational contract for the Hitchhiker's Guide chat Mastra app.

## Production mapping

- Domain: `https://chat.hitchhikersguidetothefuture.com`
- VPS SSH alias: `arc-vps`
- systemd service: `hitchhikers-guide-chat.service`
- local app port on VPS: `4142`
- app root: `/opt/hitchhikers-guide-chat`
- deployed build output: `/opt/hitchhikers-guide-chat/.mastra/output`
- runtime data directory: `/opt/hitchhikers-guide-chat/data`
- environment file: `/opt/hitchhikers-guide-chat/.env`
- Fathom site id: `LLFJJYXQ`

The app must keep runtime state outside `.mastra/output`. The service unit currently sets:

```ini
Environment=PORT=4142
Environment=GUIDE_DATA_DIR=/opt/hitchhikers-guide-chat/data
EnvironmentFile=-/opt/hitchhikers-guide-chat/.env
```

Do not run `rsync --delete` against `/opt/hitchhikers-guide-chat/` as a whole. Deploy only the build output, or explicitly exclude `.env`, `data/`, `.deploy-backups/`, and the Node runtime.

## Local gate

```bash
npm run ci:local
```

This runs:

1. TypeScript typecheck.
2. Vitest suite.
3. domain smoke test.
4. rendered HTML contract checks for Fathom script, site id, and funnel event names.
5. Mastra build.

Expected final line:

```text
LOCAL_CI_PASS hitchhikers-guide-chat
```

## Production verification

```bash
npm run verify:prod
```

Checks:

- systemd service is active;
- loopback `/healthz` returns `hitchhikers-guide-chat`;
- port `4142` is listening;
- `/opt/hitchhikers-guide-chat/data` exists and is non-empty;
- `.env` exists and has `0600` permissions;
- public `/healthz` returns the expected service name;
- public `/`, `/enter`, `/imports`, and `/app` include Fathom instrumentation and expected event names.

Expected final line:

```text
VERIFY_PROD_PASS hitchhikers-guide-chat domain=chat.hitchhikersguidetothefuture.com service=hitchhikers-guide-chat.service port=4142
```

## Deploy

Default deploy refuses a dirty Git tree:

```bash
npm run deploy:vps
```

For an explicit dirty-tree deploy, use the script directly:

```bash
bash scripts/deploy_vps.sh --allow-dirty
```

The deploy script:

1. captures Git branch, commit, dirty status, and dirty diff hash;
2. runs `scripts/local_ci.sh`;
3. creates a remote backup under `/opt/hitchhikers-guide-chat/.deploy-backups/output-<timestamp>.tgz`;
4. rsyncs local `.mastra/output/` to the VPS build output path, excluding copied `node_modules/`;
5. runs `npm install --omit=dev --no-audit --no-fund` on the VPS inside the output directory;
6. restarts `hitchhikers-guide-chat.service`;
7. runs `scripts/verify_prod.sh`;
8. writes a local deployment receipt under `deploy-receipts/<timestamp>.deploy.json`.

Receipt JSON is intentionally ignored by Git; it is an operational artifact, not source.

## Rollback

Use a known backup path from a deploy receipt or the remote backup directory:

```bash
bash scripts/rollback_vps.sh "$BACKUP_TGZ"
```

Rollback restores the backup tarball into `.mastra/output`, installs production dependencies, restarts the service, runs production verification, and writes a local rollback receipt under `deploy-receipts/`.

## Known wart

The Mastra Node process does not currently exit gracefully on SIGTERM. The production unit has been tightened to:

```ini
TimeoutStopSec=10
KillMode=mixed
```

This makes deploys stop waiting for the old 90-second timeout. It is still a forced stop after 10 seconds, not graceful shutdown. Treat that as acceptable for this stateless process only because durable app data lives under `/opt/hitchhikers-guide-chat/data`, outside the build output.

## Hardening still missing

- Atomic release directories with `current` symlink instead of direct rsync into live output.
- Staging service/domain on a separate port and data directory.
- End-to-end browser verification for auth and paid chat flows.
- Stripe checkout and webhook test-mode smoke.
- Graceful shutdown in the app/runtime if Mastra exposes a clean hook.
