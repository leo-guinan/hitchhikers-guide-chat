import { backloadMediumArchive } from '../src/domain/medium-backload';

type Args = {
  archive?: string;
  target?: string;
  sessionId?: string;
  sourceLabel?: string;
  limit?: number;
  overwrite?: boolean;
  help?: boolean;
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.archive || !args.target) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }
  const manifest = await backloadMediumArchive({
    archive: args.archive,
    target: args.target,
    sessionId: args.sessionId,
    sourceLabel: args.sourceLabel,
    limit: args.limit,
    overwrite: args.overwrite,
  });
  console.log(JSON.stringify({
    ok: true,
    target: manifest.target,
    totalPosts: manifest.totalPosts,
    writtenPages: manifest.writtenPages,
    skippedPages: manifest.skippedPages,
    manifest: 'data/backloads/medium-backload-manifest.json',
    items: manifest.itemsPath,
  }, null, 2));
}

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--archive':
        args.archive = requiredValue(argv, ++i, arg);
        break;
      case '--target':
        args.target = requiredValue(argv, ++i, arg);
        break;
      case '--session-id':
        args.sessionId = requiredValue(argv, ++i, arg);
        break;
      case '--source-label':
        args.sourceLabel = requiredValue(argv, ++i, arg);
        break;
      case '--limit':
        args.limit = Number(requiredValue(argv, ++i, arg));
        if (!Number.isInteger(args.limit) || args.limit < 1) throw new Error('--limit must be a positive integer');
        break;
      case '--overwrite':
        args.overwrite = true;
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return args;
}

function requiredValue(argv: string[], index: number, flag: string): string {
  const value = argv[index];
  if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value`);
  return value;
}

function printHelp() {
  console.log(`Medium archive to Guide diary backload\n\nUsage:\n  npm run backload:medium -- --archive /path/to/medium-export.zip --target /path/to/target-repo [options]\n\nOptions:\n  --archive PATH        Medium export directory or .zip containing posts/*.html\n  --target PATH         Repository/path to receive data/diary and receipts\n  --session-id ID       Diary session id (default: medium-backload)\n  --source-label LABEL  Source label (default: Medium archive)\n  --limit N             Import at most N posts\n  --overwrite           Replace existing data/diary/YYYY-MM-DD.json files\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
