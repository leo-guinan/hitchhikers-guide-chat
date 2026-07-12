#!/usr/bin/env node
import { convertConversationArchiveToDiary, type ConversationImportMode, type ConversationProvider } from '../src/domain/ai-conversation-diary';

const opts = parseArgs(process.argv.slice(2));

async function main() {
  if (!opts.provider) usage('Missing --provider openai|anthropic');
  if (!opts.sourceFile) usage('Missing --file path/to/conversations.json');
  const result = await convertConversationArchiveToDiary({
    provider: opts.provider,
    mode: opts.mode,
    sourceFile: opts.sourceFile,
    sessionId: opts.sessionId,
    outputDir: opts.outputDir,
    installDataDir: opts.install ? opts.dataDir : undefined,
    limit: opts.limit,
  });
  console.log(JSON.stringify({
    status: 'AI_CONVERSATION_DIARY_PASS',
    provider: result.report.provider,
    mode: result.report.mode,
    sourceFile: result.report.sourceFile,
    sessionId: opts.sessionId,
    outputDir: result.report.outputDir,
    installDataDir: opts.install ? opts.dataDir : undefined,
    conversationCount: result.report.conversationCount,
    diaryPageCount: result.report.diaryPageCount,
    dayCount: result.report.dayCount,
    dateRange: result.report.dateRange,
    installedPageCount: result.report.installedPageCount,
    skippedTurnCount: result.report.skippedTurnCount,
    fileCount: result.report.files.length,
    receiptFiles: result.report.files.filter((file) => file.endsWith('import_report.json') || file.endsWith('conversation_shapes.json') || file.endsWith('normalized_conversations.json')),
  }, null, 2));
}

type CliOptions = {
  provider?: ConversationProvider;
  mode: ConversationImportMode;
  sourceFile: string;
  sessionId: string;
  outputDir?: string;
  install: boolean;
  dataDir: string;
  limit?: number;
};

function parseArgs(args: string[]): CliOptions {
  const out: CliOptions = { sourceFile: '', sessionId: 'anonymous', mode: 'privacy', install: false, dataDir: process.env.GUIDE_DATA_DIR ?? './data' };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    switch (arg) {
      case '--provider': {
        const value = needValue(args, ++i, arg);
        if (value !== 'openai' && value !== 'anthropic') usage(`Invalid provider: ${value}`);
        out.provider = value;
        break;
      }
      case '--mode': {
        const value = needValue(args, ++i, arg);
        if (value !== 'privacy' && value !== 'full') usage(`Invalid mode: ${value}`);
        out.mode = value;
        break;
      }
      case '--file':
      case '--source':
        out.sourceFile = needValue(args, ++i, arg);
        break;
      case '--session-id':
        out.sessionId = needValue(args, ++i, arg);
        break;
      case '--out':
      case '--output-dir':
        out.outputDir = needValue(args, ++i, arg);
        break;
      case '--install':
        out.install = true;
        break;
      case '--data-dir':
        out.dataDir = needValue(args, ++i, arg);
        break;
      case '--limit':
        out.limit = Number(needValue(args, ++i, arg));
        break;
      case '--help':
      case '-h':
        usage();
        break;
      default:
        usage(`Unknown option: ${arg}`);
    }
  }
  if (!out.outputDir && out.sourceFile && out.provider) out.outputDir = `./data/ai-conversation-diary/${out.provider}-${out.mode}`;
  return out;
}

function needValue(args: string[], index: number, flag: string): string {
  const value = args[index];
  if (!value || value.startsWith('--')) usage(`Missing value for ${flag}`);
  return value;
}

function usage(error?: string): never {
  if (error) console.error(error);
  console.error(`Usage: npm run conversations:diary -- --provider openai|anthropic --file conversations.json [--mode privacy|full] [--session-id acct_...] [--out DIR] [--install --data-dir ./data]\n\nModes:\n  privacy  shape + heat/compression analysis only; no raw titles/text/keywords\n  full     full user/assistant turns plus heat/compression analysis\n\nExamples:\n  npm run conversations:diary -- --provider openai --file ~/Downloads/openai/conversations.json --mode privacy --session-id acct_123 --install\n  npm run conversations:diary -- --provider anthropic --file ~/Downloads/claude/conversations.json --mode full --out ./data/ai-conversation-diary/anthropic-full`);
  process.exit(error ? 2 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
