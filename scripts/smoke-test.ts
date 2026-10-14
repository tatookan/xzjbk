const baseUrl = (process.env.SMOKE_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const expectProductionHeaders = process.env.EXPECT_PRODUCTION_HEADERS === 'true';

async function request(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${baseUrl}${path}`, { redirect: 'manual', ...init });
}

function expectStatus(label: string, response: Response, expected: number): void {
  if (response.status !== expected) {
    throw new Error(`${label}: expected ${expected}, received ${response.status}`);
  }
}

async function main() {
  const publicRoutes = [
    '/',
    '/scripts',
    '/agent',
    '/login',
    '/terms',
    '/privacy',
    '/api/v1/health',
    '/api/v1/readiness',
    '/api/v1/showcase-posters',
    '/api/agent/v1/skill/version'
  ];
  for (const path of publicRoutes) {
    const response = await request(path);
    expectStatus(path, response, 200);
  }

  const scriptsResponse = await request('/api/v1/scripts');
  expectStatus('public script catalogue', scriptsResponse, 200);
  const scriptsPayload = (await scriptsResponse.json()) as {
    success: boolean;
    data?: { items?: { id: string }[] };
  };
  if (!scriptsPayload.success || !Array.isArray(scriptsPayload.data?.items)) {
    throw new Error('public script catalogue returned an invalid response');
  }
  const firstScriptId = scriptsPayload.data.items[0]?.id;
  if (firstScriptId) {
    const detailResponse = await request(`/api/v1/scripts/${firstScriptId}`);
    expectStatus('guest script detail protection', detailResponse, 401);
    const downloadResponse = await request(`/api/v1/scripts/${firstScriptId}/files/script`);
    expectStatus('guest private download protection', downloadResponse, 401);
    const downloadAllResponse = await request(`/api/v1/scripts/${firstScriptId}/files/all`);
    expectStatus('guest complete delivery protection', downloadAllResponse, 401);
  }

  const accountResponse = await request('/api/v1/account');
  expectStatus('guest account protection', accountResponse, 401);
  const adminResponse = await request('/api/v1/admin/orders');
  expectStatus('guest administrator protection', adminResponse, 401);
  const agentImportResponse = await request('/api/agent/v1/imports', { method: 'POST' });
  expectStatus('missing Agent Key protection', agentImportResponse, 401);

  const crossSiteResponse = await request('/api/v1/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://untrusted.example',
      'Sec-Fetch-Site': 'cross-site'
    },
    body: '{}'
  });
  expectStatus('cross-site request protection', crossSiteResponse, 403);

  const homepageResponse = await request('/');
  const commonHeaders: Record<string, string> = {
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'strict-origin-when-cross-origin'
  };
  for (const [name, expected] of Object.entries(commonHeaders)) {
    if (homepageResponse.headers.get(name) !== expected) {
      throw new Error(`security header ${name} is missing`);
    }
  }
  if (expectProductionHeaders && !homepageResponse.headers.get('content-security-policy')) {
    throw new Error('production Content-Security-Policy is missing');
  }
  if (expectProductionHeaders && !homepageResponse.headers.get('strict-transport-security')) {
    throw new Error('production Strict-Transport-Security is missing');
  }

  console.log(`Smoke test passed: ${baseUrl}`);
  console.log('Public routes, permission boundaries, cross-site protection and headers passed');
}

main().catch((error: unknown) => {
  console.error(`Smoke test failed: ${error instanceof Error ? error.message : 'unknown error'}`);
  process.exitCode = 1;
});
