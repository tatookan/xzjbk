import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile, chmod } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import { config } from 'dotenv';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { hashPassword } from 'better-auth/crypto';
import { unzipSync, strFromU8 } from 'fflate';
import sharp from 'sharp';
import type { CatalogScriptInput } from '../src/modules/script-catalog/contracts';

const run = promisify(execFile);

async function main() {
  config({ path: '.env.local', quiet: true });
  const originalUrl = process.env.AUDIT_DATABASE_URL ?? process.env.DATABASE_URL;
  assert(
    originalUrl,
    'Configure AUDIT_DATABASE_URL or DATABASE_URL for a local PostgreSQL with CREATE DATABASE permission'
  );
  const control = postgres(originalUrl, { max: 2, onnotice: () => undefined });
  const suffix = randomUUID().replaceAll('-', '');
  const databaseName = `xinzhi_audit_${suffix}`;
  const restoreName = `xinzhi_restore_${suffix}`;
  const testUrl = new URL(originalUrl);
  testUrl.pathname = `/${databaseName}`;
  const taskRoot = resolve('var/tmp');
  await mkdir(taskRoot, { recursive: true });
  const temporary = await mkdtemp(join(taskRoot, 'audit-'));
  const storageRoot = join(temporary, 'storage');
  await mkdir(storageRoot);
  let created = false;
  let restoreCreated = false;
  let sql: ReturnType<typeof postgres> | undefined;
  let applicationClient: ReturnType<typeof postgres> | undefined;
  let passed = 0;
  async function check(name: string, task: () => Promise<void>) {
    await task();
    passed++;
    console.log(`PASS ${name}`);
  }
  try {
    await control.unsafe(`CREATE DATABASE "${databaseName}"`);
    created = true;
    sql = postgres(testUrl.toString(), { max: 4, onnotice: () => undefined });
    const query = sql;
    await migrate(drizzle(query), {
      migrationsFolder: 'drizzle',
      migrationsTable: '__xinzhi_migrations',
      migrationsSchema: 'public'
    });
    Object.assign(process.env, {
      DATABASE_URL: testUrl.toString(),
      NODE_ENV: 'development',
      NEXT_PUBLIC_APP_URL: 'http://audit.test',
      STORAGE_LOCAL_ROOT: storageRoot,
      STORAGE_DRIVER: 'local',
      PAYMENT_DRIVER: 'disabled',
      BETTER_AUTH_SECRET: randomUUID() + randomUUID(),
      INVITE_CODE_PEPPER: randomUUID() + randomUUID()
    });
    delete process.env.INITIAL_ADMIN_PASSWORD;
    const { getDatabase } = await import('../src/infrastructure/database/client');
    applicationClient = getDatabase().$client;
    const catalog = await import('../src/modules/script-catalog/service');
    const { prepareNewScriptAssets } = await import('../src/modules/script-catalog/assets');
    const { purchaseScript } = await import('../src/modules/commerce/service');
    const { adjustUserPoints } = await import('../src/modules/points/service');
    const { getAuth } = await import('../src/modules/identity/auth');
    const invites = await import('../src/modules/identity/invite-code');
    const registration = await import('../src/app/api/v1/auth/register/route');
    const details = await import('../src/app/api/v1/scripts/[id]/route');
    const downloads = await import('../src/app/api/v1/scripts/[id]/files/[kind]/route');
    const archives = await import('../src/app/api/v1/scripts/[id]/files/all/route');
    const assetsRoute = await import('../src/app/api/v1/assets/[id]/route');
    const adminRoute = await import('../src/app/api/v1/admin/scripts/[id]/route');
    const pointsRoute = await import('../src/app/api/v1/admin/users/[id]/points/route');
    const agentAccess = await import('../src/modules/agent-access/service');
    const agentImportRoute = await import('../src/app/api/agent/v1/imports/route');
    const password = randomUUID();
    const passwordHash = await hashPassword(password);
    const identities = {
      admin: randomUUID(),
      a: randomUUID(),
      b: randomUUID(),
      poor: randomUUID()
    };
    for (const [name, id] of Object.entries(identities)) {
      await query`insert into users (id, name, email, role, points_balance)
        values (${id}, ${name}, ${name + '@audit.invalid'}, ${name === 'admin' ? 'admin' : 'member'}, ${name === 'poor' ? 0 : 100000})`;
      await query`insert into accounts (id, user_id, issuer, account_id, provider_id, password)
        values (${randomUUID()}, ${id}, 'local:credential', ${id}, 'credential', ${passwordHash})`;
    }
    const cookies: Record<string, string> = {};
    for (const name of Object.keys(identities)) {
      const response = await getAuth().handler(
        new Request('http://audit.test/api/auth/sign-in/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Origin: 'http://audit.test' },
          body: JSON.stringify({ email: name + '@audit.invalid', password })
        })
      );
      assert.equal(response.status, 200, 'fixture authentication');
      cookies[name] = response.headers
        .getSetCookie()
        .map((value) => value.split(';')[0])
        .join('; ');
    }
    const req = (path: string, user = '', method = 'GET', body?: unknown) =>
      new Request('http://audit.test' + path, {
        method,
        headers: {
          Cookie: cookies[user] ?? '',
          Origin: 'http://audit.test',
          'Content-Type': 'application/json'
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) })
      });
    const input: CatalogScriptInput = {
      title: 'Isolation test',
      englishTitle: 'Isolation test',
      genre: 'test',
      logline: 'test',
      synopsis: 'test synopsis',
      directorStatement: 'member-only statement',
      previewRationale: '',
      sourceUnitCount: 10,
      previewUnitLabel: '场',
      presentationMode: '演绎',
      packageMode: 'bilingual-package',
      price: 100,
      episodes: 10,
      status: 'available',
      tags: [],
      preview: [
        { en: 'PUBLIC_SAMPLE', zh: '开放试读' },
        { en: 'HIDDEN_SAMPLE', zh: '未开放试读' }
      ],
      previewVisibleCount: 1
    };
    async function newScript() {
      const id = randomUUID();
      const files = new FormData();
      const cover = await sharp({
        create: { width: 2, height: 2, channels: 3, background: '#eeeeee' }
      })
        .png()
        .toBuffer();
      files.set('cover', new File([Uint8Array.from(cover)], 'cover.png', { type: 'image/png' }));
      for (const field of ['english', 'secondary', 'director'])
        files.set(
          field,
          new File([`PRIVATE_DELIVERY_${field}`], field + '.md', { type: 'text/markdown' })
        );
      return catalog.createScript(
        id,
        input,
        await prepareNewScriptAssets(id, files),
        identities.admin
      );
    }
    const sale = await newScript();
    const context = { params: Promise.resolve({ id: sale.id }) };
    await check('guest/member/admin preview and private file authorization', async () => {
      assert.equal((await details.GET(req('/detail'), context)).status, 401);
      const member = await details.GET(req('/detail', 'a'), context);
      const payload = await member.json();
      assert.equal(payload.data.script.preview.length, 1);
      assert(!JSON.stringify(payload).includes('HIDDEN_SAMPLE'));
      assert(!JSON.stringify(payload).includes('PRIVATE_DELIVERY'));
      assert.equal(member.headers.get('cache-control'), 'private, no-store');
      const admin = await details.GET(req('/detail', 'admin'), context);
      assert.equal((await admin.json()).data.script.preview.length, 2);
      for (const [user, expected] of [
        ['', 401],
        ['a', 403],
        ['b', 403],
        ['admin', 200]
      ] as const) {
        const single = await downloads.GET(req('/file', user), {
          params: Promise.resolve({ id: sale.id, kind: 'script' })
        });
        assert.equal(single.status, expected);
        await single.arrayBuffer();
        const archive = await archives.GET(req('/all', user), context);
        assert.equal(archive.status, expected);
        await archive.arrayBuffer();
      }
      const [privateAsset] =
        await query`select asset_id from script_files where script_id=${sale.id} limit 1`;
      assert.equal(
        (
          await assetsRoute.GET(req('/asset'), {
            params: Promise.resolve({ id: privateAsset.asset_id })
          })
        ).status,
        404
      );
      const cards = await catalog.listPublicScripts();
      assert(cards.every((card) => card.preview.length === 0 && card.directorStatement === ''));
    });
    await check('insufficient balance rolls back purchase', async () => {
      await assert.rejects(purchaseScript(sale.id, identities.poor), { status: 409 });
      const [row] = await query`select status from scripts where id=${sale.id}`;
      assert.equal(row.status, 'available');
    });
    await check('two buyers: one order, one debit; duplicate purchase is safe', async () => {
      const outcomes = await Promise.allSettled([
        purchaseScript(sale.id, identities.a),
        purchaseScript(sale.id, identities.b)
      ]);
      assert.equal(outcomes.filter((x) => x.status === 'fulfilled').length, 1);
      const [order] = await query`select * from script_orders where script_id=${sale.id}`;
      const first = await purchaseScript(sale.id, order.buyer_user_id);
      assert.equal(first.alreadyOwned, true);
      const [count] =
        await query`select count(*)::int as count from point_ledger where reference_id=${order.id}`;
      assert.equal(count.count, 1);
      const buyer = order.buyer_user_id === identities.a ? 'a' : 'b';
      const other = buyer === 'a' ? 'b' : 'a';
      assert.equal((await details.GET(req('/detail', other), context)).status, 404);
      assert.equal((await details.GET(req('/detail', buyer), context)).status, 200);
      const archive = await archives.GET(req('/all', buyer), context);
      assert.equal(archive.status, 200);
      assert.equal(archive.headers.get('cache-control'), 'private, no-store');
      const files = unzipSync(new Uint8Array(await archive.arrayBuffer()));
      assert.equal(Object.keys(files).length, 3);
      assert(
        Object.values(files).every((bytes) => strFromU8(bytes).startsWith('PRIVATE_DELIVERY_'))
      );
      assert.equal((await archives.GET(req('/all', other), context)).status, 403);
      await assert.rejects(catalog.deleteScript(sale.id, identities.admin, sale.version), {
        status: 409
      });
    });
    await check('parallel editors reject stale versions and stale deletes', async () => {
      const script = await newScript();
      const outcomes = await Promise.allSettled([
        catalog.updateScript(
          script.id,
          { ...input, title: 'Editor A' },
          null,
          identities.admin,
          script.version
        ),
        catalog.updateScript(
          script.id,
          { ...input, title: 'Editor B' },
          null,
          identities.admin,
          script.version
        )
      ]);
      assert.equal(outcomes.filter((x) => x.status === 'fulfilled').length, 1);
      await assert.rejects(catalog.deleteScript(script.id, identities.admin, script.version), {
        status: 409
      });
      const missingVersion = await adminRoute.DELETE(req('/admin/script', 'admin', 'DELETE'), {
        params: Promise.resolve({ id: script.id })
      });
      assert.equal(missingVersion.status, 428);
      await catalog.deleteScript(script.id, identities.admin, script.version + 1);
    });
    await check('editing queued behind purchase cannot reopen a sold script', async () => {
      const script = await newScript();
      const blocker = await query.reserve();
      const tasks: Promise<unknown>[] = [];
      try {
        await blocker`begin`;
        await blocker`select id from scripts where id=${script.id} for update`;
        const waitForLocks = async (minimum: number) => {
          for (let attempt = 0; attempt < 100; attempt++) {
            const [row] =
              await query`select count(*)::int as count from pg_stat_activity where datname=current_database() and wait_event_type='Lock'`;
            if (row.count >= minimum) return;
            await delay(20);
          }
          throw new Error('Expected concurrent requests to wait on row locks');
        };
        tasks.push(purchaseScript(script.id, identities.a));
        await waitForLocks(1);
        tasks.push(catalog.updateScript(script.id, input, null, identities.admin, script.version));
        // Attach rejection handlers before releasing the transaction.
        const result = Promise.allSettled(tasks);
        await waitForLocks(2);
        await blocker`commit`;
        const outcomes = await result;
        assert.equal(outcomes[0].status, 'fulfilled');
        assert.equal(outcomes[1].status, 'rejected');
        const [row] = await query`select status from scripts where id=${script.id}`;
        assert.equal(row.status, 'sold');
      } finally {
        await blocker`rollback`;
        blocker.release();
        await Promise.allSettled(tasks);
      }
    });
    await check('concurrent adjustment retries create one ledger entry', async () => {
      const operationId = randomUUID();
      const [before] = await query`select points_balance from users where id=${identities.a}`;
      const result = await Promise.all(
        Array.from({ length: 4 }, () =>
          adjustUserPoints(identities.a, 40, 'audit credit', identities.admin, operationId)
        )
      );
      assert.equal(new Set(result.map((item) => item.entry.id)).size, 1);
      const [after] = await query`select points_balance from users where id=${identities.a}`;
      assert.equal(after.points_balance, before.points_balance + 40);
      await assert.rejects(
        adjustUserPoints(identities.a, 41, 'audit credit', identities.admin, operationId),
        { status: 409 }
      );
      await assert.rejects(
        adjustUserPoints(identities.b, 40, 'audit credit', identities.admin, operationId),
        { status: 409 }
      );
      const noId = await pointsRoute.POST(
        req('/points', 'admin', 'POST', { delta: 10, note: 'audit' }),
        { params: Promise.resolve({ id: identities.a }) }
      );
      assert.equal(noId.status, 422);
      assert.equal(
        (
          await pointsRoute.POST(
            req('/points', 'a', 'POST', { delta: 10, note: 'audit', operationId: randomUUID() }),
            { params: Promise.resolve({ id: identities.a }) }
          )
        ).status,
        403
      );
    });
    await check('invite registration requires consent and consumes code once', async () => {
      const invitation = await invites.generateInviteCode(identities.admin);
      const body = {
        name: 'Audit member',
        password,
        email: 'invite1@audit.invalid',
        inviteCode: invitation.code,
        acceptedPolicies: true
      };
      assert.equal(
        (
          await registration.POST(
            req('/register', '', 'POST', { ...body, acceptedPolicies: false })
          )
        ).status,
        422
      );
      const responses = await Promise.all([
        registration.POST(req('/register', '', 'POST', body)),
        registration.POST(req('/register', '', 'POST', { ...body, email: 'invite2@audit.invalid' }))
      ]);
      assert.deepEqual(responses.map((response) => response.status).sort(), [201, 400]);
      const [consent] =
        await query`select count(*)::int as count from users where terms_accepted_at is not null and privacy_accepted_at is not null`;
      assert.equal(consent.count, 1);
    });
    await check('Agent Key stays user-bound and can only create an idempotent draft', async () => {
      await agentAccess.setAgentAccess(identities.a, true, identities.admin);
      const issued = await agentAccess.createAgentApiKey({
        ownerUserId: identities.a,
        actorUserId: identities.admin,
        name: 'Audit Agent',
        expiresInDays: 30
      });
      const createAgentForm = async () => {
        const form = new FormData();
        const agentInput = {
          ...input,
          title: 'Agent Draft',
          genre: 'BL',
          tags: ['ABO', '契约关系'],
          directorStatement:
            '制作执行强调情绪节奏表演镜头色彩空间道具连续性避免误读现场调度声音设计人物关系'.repeat(14),
          previewRationale:
            '试读建立主角、关系和世界观，以契约形成冲突钩子，并避开成人内容与结局反转。',
          previewUnitLabel: '段' as const,
          status: 'available' as const
        };
        for (const [key, value] of Object.entries(agentInput)) {
          if (key === 'price' || key === 'status') continue;
          form.set(
            key,
            typeof value === 'object' ? JSON.stringify(value) : String(value)
          );
        }
        const cover = await sharp({
          create: { width: 2, height: 3, channels: 3, background: '#eeeeee' }
        })
          .png()
          .toBuffer();
        form.set('cover', new File([Uint8Array.from(cover)], 'agent-cover.png', { type: 'image/png' }));
        for (const field of ['english', 'secondary', 'director']) {
          form.set(
            field,
            new File([`AGENT_DELIVERY_${field}`], `agent-${field}.md`, {
              type: 'text/markdown'
            })
          );
        }
        return form;
      };
      const agentRequest = async (key: string, version: string, idempotencyKey: string) =>
        new Request('http://audit.test/api/agent/v1/imports', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${key}`,
            'X-Xinzhi-Skill-Version': version,
            'Idempotency-Key': idempotencyKey
          },
          body: await createAgentForm()
        });
      assert.equal(
        (await agentImportRoute.POST(await agentRequest('', '1.1.0', randomUUID()))).status,
        401
      );
      assert.equal(
        (
          await agentImportRoute.POST(
            await agentRequest(issued.secret, '1.0.0', randomUUID())
          )
        ).status,
        426
      );
      const idempotencyKey = randomUUID();
      const created = await agentImportRoute.POST(
        await agentRequest(issued.secret, '1.1.0', idempotencyKey)
      );
      assert.equal(created.status, 201);
      const createdPayload = await created.json();
      const scriptId = createdPayload.data.scriptId;
      const [draft] = await query`select status, price_points, created_by_user_id from scripts where id=${scriptId}`;
      assert.deepEqual(draft, {
        status: 'draft',
        price_points: 0,
        created_by_user_id: identities.a
      });
      const repeated = await agentImportRoute.POST(
        await agentRequest(issued.secret, '1.1.0', idempotencyKey)
      );
      assert.equal(repeated.status, 200);
      assert.equal((await repeated.json()).data.scriptId, scriptId);
      const [count] = await query`select count(*)::int as count from scripts where title='Agent Draft'`;
      assert.equal(count.count, 1);
      await agentAccess.setAgentAccess(identities.a, false, identities.admin);
      assert.equal(
        (
          await agentImportRoute.POST(
            await agentRequest(issued.secret, '1.1.0', randomUUID())
          )
        ).status,
        401
      );
    });
    const preflightEnv: NodeJS.ProcessEnv = {
      ...process.env,
      NODE_ENV: 'production',
      NEXT_PUBLIC_APP_URL: 'https://audit.invalid',
      ENV_FILE: join(temporary, 'absent.env')
    };
    const preflight = (extra: Partial<NodeJS.ProcessEnv> = {}) =>
      run(process.execPath, ['--import', 'tsx', 'scripts/validate-deployment.ts'], {
        env: { ...preflightEnv, ...extra },
        timeout: 30_000
      });
    await check(
      'preflight checks complete migrations and SHA-256, not just file size',
      async () => {
        await preflight();
        const [asset] =
          await query`select object_key from media_assets where deleted_at is null and visibility='private' limit 1`;
        const path = join(storageRoot, asset.object_key);
        const bytes = await readFile(path);
        const changed = Buffer.from(bytes);
        changed[0] ^= 1;
        try {
          await writeFile(path, changed);
          await assert.rejects(preflight());
        } finally {
          await writeFile(path, bytes);
        }
        await query`update public.__xinzhi_migrations set hash='invalid-audit-hash' where id=(select max(id) from public.__xinzhi_migrations)`;
        await assert.rejects(preflight());
        const journal = JSON.parse(await readFile('drizzle/meta/_journal.json', 'utf8'));
        const { createHash } = await import('node:crypto');
        const latestHash = createHash('sha256')
          .update(await readFile('drizzle/' + journal.entries.at(-1).tag + '.sql'))
          .digest('hex');
        await query`update public.__xinzhi_migrations set hash=${latestHash} where id=(select max(id) from public.__xinzhi_migrations)`;
        const [lastMigration] =
          await query`delete from public.__xinzhi_migrations where id=(select max(id) from public.__xinzhi_migrations) returning *`;
        try {
          await assert.rejects(preflight());
        } finally {
          await query`insert into public.__xinzhi_migrations (id, hash, created_at) values (${lastMigration.id}, ${lastMigration.hash}, ${lastMigration.created_at})`;
        }
        if (process.getuid?.() !== 0) {
          try {
            await chmod(path, 0o000);
            await assert.rejects(preflight());
          } finally {
            await chmod(path, 0o600);
          }
          try {
            await chmod(storageRoot, 0o500);
            await assert.rejects(preflight());
          } finally {
            await chmod(storageRoot, 0o700);
          }
        }
        await preflight();
      }
    );
    await check('backup restores into a NEW database and NEW file directory', async () => {
      const backupRoot = join(temporary, 'backups');
      await run('bash', ['scripts/backup-create.sh'], {
        env: { ...process.env, BACKUP_ROOT: backupRoot },
        timeout: 30_000
      });
      const [backupName] = await readdir(backupRoot);
      const backup = join(backupRoot, backupName);
      await run('bash', ['scripts/backup-verify.sh', backup], { timeout: 30_000 });
      await control.unsafe(`CREATE DATABASE "${restoreName}"`);
      restoreCreated = true;
      const restoredUrl = new URL(testUrl);
      restoredUrl.pathname = '/' + restoreName;
      const restoredStorage = join(temporary, 'restored-storage');
      await mkdir(restoredStorage);
      await run(
        'pg_restore',
        [
          '--no-owner',
          '--no-privileges',
          '--exit-on-error',
          '--dbname',
          restoreName,
          join(backup, 'database.dump')
        ],
        {
          env: {
            ...process.env,
            PGHOST: restoredUrl.hostname,
            PGPORT: restoredUrl.port || '5432',
            PGUSER: decodeURIComponent(restoredUrl.username),
            PGPASSWORD: decodeURIComponent(restoredUrl.password)
          },
          timeout: 30_000
        }
      );
      await run('tar', [
        '--no-same-owner',
        '-xzf',
        join(backup, 'storage.tar.gz'),
        '-C',
        restoredStorage
      ]);
      await preflight({
        DATABASE_URL: restoredUrl.toString(),
        STORAGE_LOCAL_ROOT: restoredStorage
      });
      const restored = postgres(restoredUrl.toString(), { max: 1 });
      try {
        const [row] =
          await restored`select count(*)::int as count from script_orders where status='completed'`;
        const [source] =
          await query`select count(*)::int as count from script_orders where status='completed'`;
        assert.equal(row.count, source.count);
      } finally {
        await restored.end();
      }
    });
    console.log(
      `Audit regression passed: ${passed} groups; isolated fixture databases and files only.`
    );
  } finally {
    await applicationClient?.end({ timeout: 2 });
    await sql?.end({ timeout: 2 });
    if (restoreCreated) await control.unsafe(`DROP DATABASE "${restoreName}" WITH (FORCE)`);
    if (created) await control.unsafe(`DROP DATABASE "${databaseName}" WITH (FORCE)`);
    await control.end({ timeout: 2 });
    // This directory is created by mkdtemp above and contains synthetic fixtures only.
    await rm(temporary, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(
    'Audit regression failed:',
    error instanceof Error ? error.message : 'unknown error'
  );
  process.exitCode = 1;
});
