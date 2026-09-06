import { mkdir, stat, readFile, open, unlink, realpath } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { isAbsolute, relative, resolve, sep } from 'node:path';

import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: process.env.ENV_FILE ?? '.env.production', override: false, quiet: true });

const PLACEHOLDER_PATTERN = /replace-with|change-me|example-secret/i;

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function assertSecret(name: string): string {
  const value = required(name);
  if (value.length < 32 || PLACEHOLDER_PATTERN.test(value)) {
    throw new Error(`${name} must be at least 32 characters and cannot be a placeholder`);
  }
  return value;
}

function safeStorageTarget(root: string, objectKey: string): string {
  const target = resolve(root, objectKey);
  const child = relative(root, target);
  if (!child || child === '..' || child.startsWith(`..${sep}`) || isAbsolute(child)) {
    throw new Error(`Invalid storage object key: ${objectKey}`);
  }
  return target;
}

async function main() {
  const appUrl = new URL(required('NEXT_PUBLIC_APP_URL'));
  if (appUrl.protocol !== 'https:') throw new Error('NEXT_PUBLIC_APP_URL must use HTTPS');

  const databaseUrl = required('DATABASE_URL');
  if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    throw new Error('DATABASE_URL must be a PostgreSQL URL');
  }

  const authSecret = assertSecret('BETTER_AUTH_SECRET');
  const invitePepper = assertSecret('INVITE_CODE_PEPPER');
  if (authSecret === invitePepper) {
    throw new Error('BETTER_AUTH_SECRET and INVITE_CODE_PEPPER must be different');
  }
  if ((process.env.STORAGE_DRIVER ?? 'local') !== 'local') {
    throw new Error('STORAGE_DRIVER must remain local until the OSS adapter is implemented');
  }
  if ((process.env.PAYMENT_DRIVER ?? 'disabled') !== 'disabled') {
    throw new Error('PAYMENT_DRIVER must remain disabled until the Alipay adapter is implemented');
  }
  if (process.env.INITIAL_ADMIN_PASSWORD) {
    throw new Error('Remove INITIAL_ADMIN_PASSWORD after the first administrator is created');
  }

  const storageRoot = required('STORAGE_LOCAL_ROOT');
  if (!isAbsolute(storageRoot) || resolve(storageRoot) === resolve('/')) {
    throw new Error('STORAGE_LOCAL_ROOT must be an absolute, dedicated directory');
  }
  await mkdir(storageRoot, { recursive: true, mode: 0o750 });
  const realRoot = await realpath(storageRoot);
  const probe = resolve(realRoot, `.preflight-${randomUUID()}`);
  const probeBytes = randomUUID();
  const handle = await open(probe, 'wx', 0o600);
  try {
    await handle.writeFile(probeBytes);
    await handle.sync();
    if ((await readFile(probe, 'utf8')) !== probeBytes)
      throw new Error('Storage read/write probe failed');
  } finally {
    await handle.close();
    await unlink(probe);
  }

  const sql = postgres(databaseUrl, { max: 1, connect_timeout: 5, prepare: false });
  try {
    const [database] = await sql<{ database: string; migrations: string | null }[]>`
      select current_database() as database,
             to_regclass('public.__xinzhi_migrations')::text as migrations
    `;
    if (!database?.migrations) throw new Error('Database migrations have not been applied');
    const journal = JSON.parse(await readFile(resolve('drizzle/meta/_journal.json'), 'utf8')) as {
      entries: { tag: string; when: number }[];
    };
    const expected = await Promise.all(
      journal.entries.map(async (entry) => ({
        hash: createHash('sha256')
          .update(await readFile(resolve('drizzle', `${entry.tag}.sql`)))
          .digest('hex'),
        createdAt: entry.when
      }))
    );
    const applied = await sql<{ hash: string; created_at: string }[]>`
      select hash, created_at from public.__xinzhi_migrations order by created_at, id
    `;
    if (
      applied.length !== expected.length ||
      expected.some(
        (entry, index) =>
          applied[index]?.hash !== entry.hash ||
          Number(applied[index]?.created_at) !== entry.createdAt
      )
    ) {
      throw new Error(
        'Applied database migrations do not match this release; run the release migrations before starting'
      );
    }

    const assets = await sql<
      { objectKey: string; sizeBytes: string; checksum: string; provider: string }[]
    >`
      select object_key as "objectKey", size_bytes as "sizeBytes", checksum_sha256 as checksum, provider
      from media_assets
      where deleted_at is null
    `;
    const invalidAssets: string[] = [];
    for (const asset of assets) {
      try {
        if (asset.provider !== 'local') throw new Error('Unsupported asset provider');
        const target = await realpath(safeStorageTarget(realRoot, asset.objectKey));
        safeStorageTarget(realRoot, relative(realRoot, target));
        const file = await stat(target);
        if (!file.isFile() || file.size !== Number(asset.sizeBytes))
          throw new Error('Invalid asset size');
        const hash = createHash('sha256');
        for await (const chunk of createReadStream(target)) hash.update(chunk);
        if (hash.digest('hex') !== asset.checksum) throw new Error('Invalid asset checksum');
      } catch {
        invalidAssets.push(asset.objectKey);
      }
    }
    if (invalidAssets.length) {
      throw new Error(
        `${invalidAssets.length} storage object(s) are missing or damaged: ${invalidAssets.slice(0, 3).join(', ')}`
      );
    }

    console.log(`Deployment check passed: ${appUrl.host}`);
    console.log(`Database ready: ${database.database}`);
    console.log(`Storage ready: ${storageRoot} (${assets.length} object(s) verified)`);
    console.log('Payment driver: disabled');
  } finally {
    await sql.end({ timeout: 2 });
  }
}

main().catch((error: unknown) => {
  console.error(
    `Deployment check failed: ${error instanceof Error ? error.message : 'unknown error'}`
  );
  process.exitCode = 1;
});
