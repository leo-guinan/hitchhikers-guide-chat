# Hitchhiker's Guide to the Future

AI chat for people who already use AI but need missing human context added to the loop.

One price: $42/month.

V0 product loop:

1. Each day opens as its own diary page and chat context.
2. User chats with the Guide inside that day page.
3. The Guide answers directly when it can.
4. If the answer depends on local, private, current, or relationship-specific context, the user can request human context.
5. After the day ends, the page can compress into a searchable diary entry that can still be expanded back into its source turns.
6. The user can send the chat log to the future for delayed human analysis: 24 hours, 72 hours, or one week.
7. Human review opens an operator-readable context request and context can be added back later.

This repo is the Mastra application server. Chat uses an OpenAI-compatible `/chat/completions` endpoint when `OPENAI_API_KEY` is configured and falls back to a deterministic local answer when it is not. The context-request boundary is always real.

## Commands

```bash
npm install
npm run typecheck
npm test
npm run smoke
npm run build
npm run dev
npm run substack:diary -- <substack-url-or-slug> --out ./data/substack-diary/<name>
npm run substack:diary -- <substack-url-or-slug> --session-id acct_... --install --data-dir ./data
npm run conversations:diary -- --provider openai --file conversations.json --mode privacy --session-id acct_... --install
```

## Substack to diary conversion

```bash
npm run substack:diary -- white-mirror --out ./data/substack-diary/white-mirror
```

The converter paginates Substack's archive API by offset, cross-checks `/sitemap.xml`, and writes:

- `all_posts.json` — normalized Substack posts
- `scrape_completeness_report.json` — offset probe, date range, sitemap/API diff counts
- `manifest.json` — generated file list
- `diary/*.json` — Guide-compatible `DiaryPage` JSON, one page per post

By default the command exits non-zero if the completeness gate fails. Use `--allow-incomplete` only for explicit partial backfills. Add `--install --session-id <account-id>` to merge generated pages into `data/diary/YYYY-MM-DD.json`; same-day posts are appended to one diary page and repeated installs skip duplicate turns. Generated sidecar output under `data/substack-diary/` is ignored by Git.

## OpenAI / Anthropic conversation archive imports

```bash
npm run conversations:diary -- --provider openai --file ~/Downloads/openai/conversations.json --mode privacy --session-id acct_... --install
npm run conversations:diary -- --provider anthropic --file ~/Downloads/claude/conversations.json --mode full --session-id acct_... --out ./data/ai-conversation-diary/anthropic-full
```

Modes:

- `privacy` — imports only conversation shape and compression analysis: role sequence, turn-size buckets, question/code counts, heat score, and user/assistant balance. It deliberately excludes raw titles, raw text, snippets, URLs, names, and keywords.
- `full` — imports full user/assistant turns plus the same heat/compression analysis.

The adapters understand OpenAI `mapping` exports and Anthropic `chat_messages` exports. Add `--install --data-dir ./data` to merge generated diary pages into the app's diary store. Generated sidecar output under `data/ai-conversation-diary/` is ignored by Git.

## Routes

- `GET /` — chat UI
- `GET /healthz` — health check
- `GET /pricing` — single $42/month plan
- `POST /auth/request-code` — request a six-digit email sign-in code
- `POST /auth/verify` — verify code and return an account token
- `GET /auth/me` — inspect signed-in account/paywall state
- `POST /chat` — answer a user message; requires authenticated paid account
- `GET /diary/today` — current day page
- `GET /diary/:day` — expand one diary page
- `GET /diary?query=...` — search diary pages and compressed entries
- `POST /diary/:day/compress` — compress a day into a diary entry
- `POST /future-analysis` — queue delayed human review for a diary page
- `POST /checkout/session` — create a Stripe Checkout Session for `price_1Ts6ceGzXpChNrVvnNrQ44Ms`
- `POST /stripe/webhook` — mark paid accounts from signed Stripe subscription events
- `POST /context-requests` — ask a human to look something up/add context
- `GET /context-requests` — operator request inbox

## Environment

```bash
OPENAI_BASE_URL=https://openrouter.ai/api/v1 # optional; defaults to OpenAI
OPENAI_API_KEY=...
OPENAI_MODEL=openai/gpt-5-mini
STRIPE_PRICE_ID=price_1Ts6ceGzXpChNrVvnNrQ44Ms
STRIPE_SECRET_KEY=<server-side-stripe-secret-key>
STRIPE_WEBHOOK_SECRET=<stripe-webhook-signing-secret>
GUIDE_FREE_ACCESS_EMAILS=founder@example.com # optional local/operator bypass
GUIDE_DATA_DIR=./data
```

If `STRIPE_SECRET_KEY` is absent, the checkout endpoint returns a 503 with an explicit configuration message instead of pretending checkout worked.
`STRIPE_WEBHOOK_SECRET` is required before `/stripe/webhook` will accept subscription events.
