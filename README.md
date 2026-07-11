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
```

## Routes

- `GET /` — chat UI
- `GET /healthz` — health check
- `GET /pricing` — single $42/month plan
- `POST /chat` — answer a user message
- `GET /diary/today` — current day page
- `GET /diary/:day` — expand one diary page
- `GET /diary?query=...` — search diary pages and compressed entries
- `POST /diary/:day/compress` — compress a day into a diary entry
- `POST /future-analysis` — queue delayed human review for a diary page
- `POST /checkout/session` — create a Stripe Checkout Session for `price_1Ts6ceGzXpChNrVvnNrQ44Ms`
- `POST /context-requests` — ask a human to look something up/add context
- `GET /context-requests` — operator request inbox

## Environment

```bash
OPENAI_BASE_URL=https://openrouter.ai/api/v1 # optional; defaults to OpenAI
OPENAI_API_KEY=...
OPENAI_MODEL=openai/gpt-5-mini
STRIPE_PRICE_ID=price_1Ts6ceGzXpChNrVvnNrQ44Ms
STRIPE_SECRET_KEY=<server-side-stripe-secret-key>
GUIDE_DATA_DIR=./data
```

If `STRIPE_SECRET_KEY` is absent, the checkout endpoint returns a 503 with an explicit configuration message instead of pretending checkout worked.
