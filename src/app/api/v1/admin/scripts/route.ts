import { requireAdmin } from '@/modules/identity/session';
import { prepareNewScriptAssets } from '@/modules/script-catalog/assets';
import { createScript, createScriptId, listAdminScripts } from '@/modules/script-catalog/service';
import { readCatalogScriptInput } from '@/modules/script-catalog/validation';
import { withApiHandler } from '@/shared/api/handler';
import { assertTrustedOrigin } from '@/shared/api/request';

export function GET(request: Request) {
  return withApiHandler(request, async () => {
    await requireAdmin(request.headers);
    return {
      data: { items: await listAdminScripts() },
      headers: { 'Cache-Control': 'private, no-store' }
    };
  });
}

export function POST(request: Request) {
  return withApiHandler(request, async () => {
    assertTrustedOrigin(request);
    const session = await requireAdmin(request.headers);
    const formData = await request.formData();
    const input = readCatalogScriptInput(formData);
    const id = createScriptId();
    const assets = await prepareNewScriptAssets(id, formData);
    const script = await createScript(id, input, assets, session.user.id);
    return {
      data: { script },
      status: 201,
      headers: { 'Cache-Control': 'private, no-store' }
    };
  });
}
