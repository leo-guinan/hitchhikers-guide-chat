import { backloadXArchiveToImports } from '../src/domain/x-archive-backload';
import { getAccountByEmail } from '../src/domain/store';

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  const email = arg('email') ?? process.env.GUIDE_OWNER_EMAIL ?? 'leo@ideanexusventures.com';
  const account = await getAccountByEmail(email);
  if (!account) throw new Error(`Account not found for ${email}`);
  const tweetsFile = arg('tweets') ?? process.env.X_ARCHIVE_TWEETS_FILE;
  if (!tweetsFile) throw new Error('Missing --tweets=/path/to/tweets.js');
  const noteTweetsFile = arg('notes') ?? process.env.X_ARCHIVE_NOTE_TWEETS_FILE;
  const target = arg('target') ?? process.cwd();
  const handle = arg('handle') ?? process.env.X_ARCHIVE_HANDLE;
  const label = arg('label') ?? process.env.X_ARCHIVE_LABEL ?? 'X / Twitter archive';
  const limit = arg('limit') ? Number(arg('limit')) : undefined;
  const includeRetweets = process.argv.includes('--include-retweets');

  const manifest = await backloadXArchiveToImports({
    tweetsFile,
    noteTweetsFile,
    target,
    accountId: account.id,
    label,
    handle,
    limit: Number.isFinite(limit) ? limit : undefined,
    includeRetweets,
  });
  console.log(JSON.stringify({
    accountId: account.id,
    email: account.email,
    imported: manifest.imported,
    skippedExisting: manifest.skippedExisting,
    skippedRetweets: manifest.skippedRetweets,
    totalCandidates: manifest.totalCandidates,
    dateRange: manifest.dateRange,
    sourceId: manifest.sourceId,
    manifest: 'data/backloads/x-archive-import-backload-manifest.json',
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
