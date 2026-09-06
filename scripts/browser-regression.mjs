import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { expect } from 'playwright/test';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';

// Use synthetic responses in a separate browser context: no real accounts or purchases.
const baseUrl = process.env.SMOKE_BASE_URL ?? 'http://localhost:3000';
const taskRoot = resolve('var/tmp');
await mkdir(taskRoot, { recursive: true });
const temporary = await mkdtemp(join(taskRoot, 'browser-'));
const originalTmpdir = process.env.TMPDIR;
process.env.TMPDIR = temporary;
let browser;
const users = {
  a: {
    id: 'audit-a',
    name: 'Audit A',
    email: 'a@audit.invalid',
    role: 'member',
    pointsBalance: 111
  },
  b: {
    id: 'audit-b',
    name: 'Audit B',
    email: 'b@audit.invalid',
    role: 'member',
    pointsBalance: 222
  },
  admin: {
    id: 'audit-admin',
    name: 'Audit Admin',
    email: 'admin@audit.invalid',
    role: 'admin',
    pointsBalance: 0
  }
};
let active = 'a';
let failMemberRequests = false;
const card = {
  id: 'audit-script',
  version: 1,
  title: 'Audit Script',
  englishTitle: 'Audit Script',
  genre: 'test',
  image: '/portal/cover-mirror.jpg',
  logline: 'Synthetic browser fixture',
  synopsis: '',
  directorStatement: '',
  directorSections: [],
  preview: [],
  previewVisibleCount: 1,
  sourceUnitCount: 10,
  previewUnitCount: 1,
  previewUnitLabel: '场',
  previewRationale: '',
  presentationMode: '演绎',
  packageMode: 'bilingual-package',
  price: 100,
  status: 'available',
  episodes: 10,
  tags: [],
  format: 'MD',
  deliverables: {
    script: 'script.md',
    bilingual: 'bilingual.md',
    directorStatement: 'director.md'
  },
  detailLoaded: false
};
const fullDetail = () => ({
  ...card,
  synopsis: 'Fixture synopsis',
  directorStatement: 'PRIVATE_CONTEXT_' + active,
  preview: [{ en: 'SAMPLE_' + active, zh: '试读' }],
  detailLoaded: true
});
const errors = [];
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = (value, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) });
    const ok = (data) => json({ success: true, data });
    if (path === '/api/auth/get-session') {
      if (!active) return json(null);
      const user = users[active];
      return json({
        user: {
          ...user,
          emailVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        session: {
          id: 'session-' + user.id,
          token: 'fixture',
          userId: user.id,
          expiresAt: new Date(Date.now() + 86400000).toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });
    }
    if (path === '/api/auth/sign-out') {
      active = '';
      return json({ success: true });
    }
    if (path === '/api/v1/account') {
      if (failMemberRequests) return json({ success: false }, 503);
      return ok({
        user: { ...users[active], points: active === 'a' ? 1111 : 222 },
        purchasedScriptIds: active === 'a' ? [card.id] : [],
        ledger: []
      });
    }
    if (path === '/api/v1/scripts') return ok({ items: [card] });
    if (path === '/api/v1/admin/scripts') return ok({ items: [fullDetail()] });
    if (path === '/api/v1/scripts/' + card.id) {
      if (failMemberRequests) return json({ success: false }, 503);
      return ok({ script: fullDetail() });
    }
    if (path.startsWith('/api/v1/admin/')) return ok({ items: [] });
    return json({ success: false }, 404);
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(baseUrl + '/scripts/' + card.id);
  await expect(page.getByText('PRIVATE_CONTEXT_a', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: '下载全部交付物料', exact: true })).toBeVisible();
  await expect(page.locator('header')).toContainText('1,111');
  const otherTab = await context.newPage();
  await otherTab.goto(baseUrl + '/scripts');
  const notifySessionChange = () =>
    otherTab.evaluate(() => {
      localStorage.setItem(
        'better-auth.message',
        JSON.stringify({
          event: 'session',
          data: { trigger: 'signIn' },
          timestamp: Date.now()
        })
      );
    });
  active = 'b';
  failMemberRequests = true;
  await notifySessionChange();
  await expect(page.locator('header')).toContainText('222');
  await expect(page.locator('header')).not.toContainText('1,111');
  await expect(page.getByText('PRIVATE_CONTEXT_a', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: '下载全部交付物料', exact: true })).toHaveCount(0);
  console.log(
    'PASS same-role cross-tab account change clears old balance, ownership and reader even when refresh fails'
  );
  failMemberRequests = false;
  active = 'admin';
  await notifySessionChange();
  await expect(page.getByText('PRIVATE_CONTEXT_admin', { exact: true })).toBeVisible();
  active = 'b';
  await notifySessionChange();
  await expect(page.getByText('PRIVATE_CONTEXT_b', { exact: true })).toBeVisible();
  await expect(page.getByText('PRIVATE_CONTEXT_admin', { exact: true })).toHaveCount(0);
  console.log('PASS admin-to-member change clears admin detail cache');
  await page.getByRole('button', { name: '打开账户菜单' }).click();
  await page.getByRole('menuitem', { name: '退出登录' }).click();
  await expect(
    page.locator('header').getByRole('link', { name: '登录 / 注册', exact: true })
  ).toBeVisible();
  await expect(page.getByText('PRIVATE_CONTEXT_b', { exact: true })).toHaveCount(0);
  assert.deepEqual(errors, []);
  console.log('PASS logout clears reader; no browser runtime errors');
} finally {
  try {
    await browser?.close();
  } finally {
    if (originalTmpdir === undefined) delete process.env.TMPDIR;
    else process.env.TMPDIR = originalTmpdir;
    await rm(temporary, { recursive: true, force: true });
  }
}
