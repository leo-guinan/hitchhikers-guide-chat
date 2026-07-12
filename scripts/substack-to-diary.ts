#!/usr/bin/env node
import { convertSubstackToDiary } from '../src/domain/substack-diary';

const args = process.argv.slice(2);
const opts = parseArgs(args);

async function main() {
  if (!opts.source) usage('Missing Substack URL or slug');
  const sessionId = opts.sessionId ?? `substack-${slugify(opts.source)}`;
  const outputDir = opts.outputDir ?? `./data/substack-diary/${slugify(opts.source)}`;
  const installDataDir = opts.install ? opts.dataDir : undefined;
  const result = await convertSubstackToDiary(opts.source, {
    sessionId,
    outputDir,
    installDataDir,
    pageSize: opts.pageSize,
    maxPosts: opts.maxPosts,
  });
  const status = result.report.complete ? 'SUBSTACK_DIARY_PASS' : 'SUBSTACK_DIARY_INCOMPLETE';
  console.log(JSON.stringify({
    status,
    source: opts.source,
    sessionId,
    outputDir,
    installDataDir,
    totalPosts: result.report.totalPosts,
    diaryPageCount: result.report.diaryPageCount,
    installedPageCount: result.report.installedPageCount,
    skippedTurnCount: result.report.skippedTurnCount,
    complete: result.report.complete,
    sitemapPostUrlCount: result.report.sitemapPostUrlCount,
    apiMissingFromSitemapCount: result.report.apiMissingFromSitemapCount,
    sitemapMissingFromApiCount: result.report.sitemapMissingFromApiCount,
    files: result.report.files,
  }, null, 2));
  if (!result.report.complete && opts.requireComplete) process.exit(1);
}

type CliOptions = {
  source: string;
  outputDir?: string;
  sessionId?: string;
  pageSize?: number;
  maxPosts?: number;
  install: boolean;
  dataDir: string;
  requireComplete: boolean;
};

function parseArgs(values: string[]): CliOptions {
  const out: CliOptions = { source: '', install: false, dataDir: process.env.GUIDE_DATA_DIR ?? './data', requireComplete: true };
  for (let i = 0; i < values.length; i += 1) {
    const arg = values[i];
    switch (arg) {
      case '--out':
      case '--output-dir':
        out.outputDir = needValue(values, ++i, arg);
        break;
      case '--session-id':
        out.sessionId = needValue(values, ++i, arg);
        break;
      case '--page-size':
        out.pageSize = Number(needValue(values, ++i, arg));
        break;
      case '--max-posts':
        out.maxPosts = Number(needValue(values, ++i, arg));
        break;
      case '--install':
        out.install = true;
        break;
      case '--data-dir':
        out.dataDir = needValue(values, ++i, arg);
        break;
      case '--allow-incomplete':
        out.requireComplete = false;
        break;
      case '--help':
      case '-h':
        usage();
        break;
      default:
        if (arg.startsWith('-')) usage(`Unknown option: ${arg}`);
        if (out.source) usage(`Unexpected positional argument: ${arg}`);
        out.source = arg;
    }
  }
  return out;
}

function needValue(values: string[], index: number, flag: string): string {
  const value = values[index];
  if (!value || value.startsWith('--')) usage(`Missing value for ${flag}`);
  return value;
}

function usage(error?: string): never {
  if (error) console.error(error);
  console.error(`Usage: npm run substack:diary -- <substack-url-or-slug> [--out DIR] [--session-id ID] [--install] [--data-dir DIR] [--allow-incomplete]\n\nExamples:\n  npm run substack:diary -- hitchhikertothefuture --out ./data/substack-diary/white-mirror\n  npm run substack:diary -- https://example.substack.com --session-id acct_123 --install --data-dir ./data`);
  process.exit(error ? 2 : 0);
}

function slugify(value: string): string {
  return value
    .replace(/^https?:\/\//, '')
    .replace(/\.substack\.com.*$/, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'substack';
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
