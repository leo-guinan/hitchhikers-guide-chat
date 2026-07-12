# Deployment

Operational contract for the Hitchhiker's Guide chat Mastra app.

## Production mapping

- Domain: `https://chat.hitchhikersguidetothefuture.com`
- VPS SSH alias: `arc-vps`
- systemd service: `hitchhikers-guide-chat.service`
- local app port on VPS: `4142`
- app root: `/opt/hitchhikers-guide-chat`
- current release symlink: `/opt/hitchhikers-guide-chat/current`
- release directories: `/opt/hitchhikers-guide-chat/releases/<timestamp>-<commit>/output`
- legacy build output: `/opt/hitchhikers-guide-chat/.mastra/output` (kept only as migration fallback)
- runtime data directory: `/opt/hitchhikers-guide-chat/data`
- environment file: `/opt/hitchhikers-guide-chat/.env`
- Fathom site id: `LLFJJYXQ`

## Staging mapping

- VPS SSH alias: `arc-vps`
- systemd service: `hitchhikers-guide-chat-staging.service`
- local app port on VPS: `4143`
- app root: `/opt/hitchhikers-guide-chat-staging`
- current release symlink: `/opt/hitchhikers-guide-chat-staging/current`
- release directories: `/opt/hitchhikers-guide-chat-staging/releases/<timestamp>-<commit>/output`
- runtime data directory: `/opt/hitchhikers-guide-chat-staging/data`
- environment file: `/opt/hitchhikers-guide-chat-staging/.env`
- public domain: none by default; staging verifies over VPS loopback.

The app must keep runtime state outside release output directories. The service unit should run from the current symlink and keep data outside the build:

```ini
WorkingDirectory=/opt/hitchhikers-guide-chat/current
Environment=PORT=4142
Environment=GUIDE_DATA_DIR=/opt/hitchhikers-guide-chat/data
EnvironmentFile=-/opt/hitchhikers-guide-chat/.env
```

Do not run `rsync --delete` against `/opt/hitchhikers-guide-chat/` as a whole. Deploy only into a fresh release directory, or explicitly exclude `.env`, `data/`, `.deploy-backups/`, `releases/`, `current`, and the Node runtime.

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

For staging:

```bash
npm run verify:staging
# equivalent: TARGET_ENV=staging bash scripts/verify_prod.sh
```

Checks, using either the public production domain or staging loopback:

- systemd service is active;
- loopback `/healthz` returns `hitchhikers-guide-chat`;
- port `4142` is listening;
- `/opt/hitchhikers-guide-chat/data` exists and is non-empty;
- `.env` exists and has `0600` permissions;
- `/opt/hitchhikers-guide-chat/current` exists and points at an output directory;
- the running service process has its cwd at the current symlink target;
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

For staging:

```bash
npm run deploy:staging
# equivalent: TARGET_ENV=staging bash scripts/deploy_vps.sh
```

For an explicit dirty-tree deploy, use the script directly:

```bash
bash scripts/deploy_vps.sh --allow-dirty
```

The deploy script:

1. captures Git branch, commit, dirty status, and dirty diff hash;
2. runs `scripts/local_ci.sh`;
3. creates a remote backup under `/opt/hitchhikers-guide-chat/.deploy-backups/output-<timestamp>.tgz`;
4. creates a fresh release directory under `/opt/hitchhikers-guide-chat/releases/<timestamp>-<commit>/output`;
5. rsyncs local `.mastra/output/` into that release output directory, excluding copied `node_modules/`;
6. runs `npm install --omit=dev --no-audit --no-fund` on the VPS inside the release output directory;
7. atomically switches `/opt/hitchhikers-guide-chat/current` to the new release output;
8. updates systemd to use `WorkingDirectory=/opt/hitchhikers-guide-chat/current`;
9. restarts `hitchhikers-guide-chat.service`;
10. runs `scripts/verify_prod.sh`;
11. writes a local deployment receipt under `deploy-receipts/<timestamp>.deploy.json`.

Receipt JSON is intentionally ignored by Git; it is an operational artifact, not source.

For staging, the deploy script bootstraps `/opt/hitchhikers-guide-chat-staging`, creates an empty `0600` `.env` if needed, seeds `data/.keep`, installs `hitchhikers-guide-chat-staging.service`, and verifies through `http://127.0.0.1:4143` over SSH. It does not require public DNS.

## New-user journey agent

```bash
npm run agent:new-user
```

This staging-only agent refuses to run unless `TARGET_ENV=staging`, port `4143`, and an app dir containing `staging` are in use. It walks a new account through:

1. cover, boarding, and sealed app pages;
2. invalid email validation;
3. email-code sign-in using staging `devCode`;
4. unpaid chat/paywall checks;
5. explicit staging-only operator payment flip in `/opt/hitchhikers-guide-chat-staging/data/accounts`;
6. paid chat;
7. human context request;
8. future-analysis request;
9. diary compression and search;
10. import source creation, import run, and artifact search.

It writes reports under `dogfood-output/new-user-agent/`, which is ignored by Git. The agent is HTTP/API based: it records route HTML text and controls, but it is not a full browser/JavaScript/localStorage test. Use Playwright or a public staging domain when we need real visual/browser proof.

## Rollback

Use a known release output path from a deploy receipt, or a backup tarball from the remote backup directory:

```bash
bash scripts/rollback_vps.sh "$RELEASE_OUTPUT_OR_BACKUP_TGZ"
TARGET_ENV=staging bash scripts/rollback_vps.sh "$RELEASE_OUTPUT_OR_BACKUP_TGZ"
```

Rollback switches `/opt/hitchhikers-guide-chat/current` to the selected release output. If given a tarball, it first restores that tarball under `releases/rollback-<timestamp>/output`. It then installs production dependencies, restarts the service, runs production verification, and writes a local rollback receipt under `deploy-receipts/`.

## Known wart

The Mastra Node process does not currently exit gracefully on SIGTERM. The production unit has been tightened to:

```ini
TimeoutStopSec=10
KillMode=mixed
```

This makes deploys stop waiting for the old 90-second timeout. It is still a forced stop after 10 seconds, not graceful shutdown. Treat that as acceptable for this stateless process only because durable app data lives under `/opt/hitchhikers-guide-chat/data`, outside the build output.

## Hardening still missing

- Public staging domain and TLS, if/when browser-accessible staging is worth the surface area.
- End-to-end browser verification for auth and paid chat flows.
- Stripe checkout and webhook test-mode smoke.
- Graceful shutdown in the app/runtime if Mastra exposes a clean hook.
