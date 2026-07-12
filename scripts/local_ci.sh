#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "== local_ci: typecheck =="
npm run typecheck

echo "== local_ci: tests =="
npm test

echo "== local_ci: smoke =="
npm run smoke

echo "== local_ci: rendered HTML contract =="
node --import tsx - <<'JS'
import { appHtml, enterHtml, appPageHtml, searchHtml, importsHtml } from './src/ui/app-html.ts';

const pages = { appHtml, enterHtml, appPageHtml, searchHtml, importsHtml };
const requiredInEveryPage = [
  'https://cdn.usefathom.com/script.js',
  'data-site="LLFJJYXQ"',
];
for (const [name, html] of Object.entries(pages)) {
  for (const needle of requiredInEveryPage) {
    if (!html.includes(needle)) throw new Error(`${name} missing ${needle}`);
  }
}
const eventChecks = [
  [enterHtml, 'Guide Sign In Code Requested'],
  [enterHtml, 'Guide Sign In Code Submitted'],
  [enterHtml, 'Guide Sign In Paid'],
  [enterHtml, 'Guide Sign In Unpaid'],
  [enterHtml, 'Guide Checkout Started'],
  [appPageHtml, 'Guide Chat Sent'],
  [appPageHtml, 'Guide Diary Compressed'],
];
for (const [html, eventName] of eventChecks) {
  if (!html.includes(eventName)) throw new Error(`missing analytics event ${eventName}`);
}
console.log('LOCAL_HTML_CONTRACT_OK');
JS

echo "== local_ci: build =="
npm run build

echo "LOCAL_CI_PASS hitchhikers-guide-chat"
