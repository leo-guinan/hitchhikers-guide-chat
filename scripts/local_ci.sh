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
import { appHtml, enterHtml, appPageHtml, searchHtml, hotspotsHtml, importsHtml } from './src/ui/app-html.ts';
import vm from 'node:vm';

const pages = { appHtml, enterHtml, appPageHtml, searchHtml, hotspotsHtml, importsHtml };
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
for (const [name, html] of Object.entries({ appPageHtml, searchHtml, importsHtml })) {
  const refreshIndex = html.indexOf('async function refreshMe');
  const firstCallIndex = html.indexOf('await refreshMe()');
  if (refreshIndex < 0 || firstCallIndex < 0 || refreshIndex > firstCallIndex) {
    throw new Error(`${name} calls refreshMe before the shared helper is defined`);
  }
  const scripts = Array.from(html.matchAll(/<script>([\s\S]*?)<\/script>/g)).map((match) => match[1]);
  for (const script of scripts) new vm.Script(script, { filename: `${name}.inline.js` });
}
if (!hotspotsHtml.includes('How a private AI furnace became a public thesis.')) throw new Error('hotspots page missing headline');
if (!hotspotsHtml.includes('Problematic pattern to watch')) throw new Error('hotspots page missing risk analysis');
console.log('LOCAL_HTML_CONTRACT_OK');
JS

echo "== local_ci: build =="
npm run build

echo "LOCAL_CI_PASS hitchhikers-guide-chat"
