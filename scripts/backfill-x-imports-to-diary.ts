import { backfillXImportedItemsToDiary } from '../src/domain/x-archive-backload';
import { getAccountByEmail, listImportedItems } from '../src/domain/store';

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length);
}

async function main() {
  const email = arg('email') ?? process.env.GUIDE_OWNER_EMAIL ?? 'leo@ideanexusventures.com';
  const account = await getAccountByEmail(email);
  if (!account) throw new Error(`Account not found for ${email}`);
  const sourceLabel = arg('label') ?? process.env.X_ARCHIVE_LABEL ?? 'Leo X archive';
  const dataDir = arg('data-dir') ?? process.env.GUIDE_DATA_DIR ?? 'data';
  const items = await listImportedItems(account.id, { limit: 100_000 });
  const manifest = await backfillXImportedItemsToDiary({ items, accountId: account.id, dataDir, sourceLabel });
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
