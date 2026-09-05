import { requireAdmin } from '@/modules/identity/session';
import { prepareScriptCover, readFileField } from '@/modules/script-catalog/assets';
import { deleteScript, updateScript } from '@/modules/script-catalog/service';
import { readCatalogScriptInput } from '@/modules/script-catalog/validation';
import { withApiHandler } from '@/shared/api/handler';
import { assertTrustedOrigin } from '@/shared/api/request';

interface ScriptRouteContext {
  params: Promise<{ id: string }>;
}

export function PATCH(request: Request, context: ScriptRouteContext) {
  return withApiHandler(request, async () => {
    assertTrustedOrigin(request);
    const session = await requireAdmin(request.headers);
    const { id } = await context.params;
    const formData = await request.formData();
    const input = readCatalogScriptInput(formData);
    const coverFile = readFileField(formData, 'cover', false);
    const cover = coverFile ? await prepareScriptCover(id, coverFile) : null;
    const script = await updateScript(id, input, cover, session.user.id);
    return {
      data: { script },
      headers: { 'Cache-Control': 'private, no-store' }
    };
  });
}

export function DELETE(request: Request, context: ScriptRouteContext) {
  return withApiHandler(request, async () => {
    assertTrustedOrigin(request);
    const session = await requireAdmin(request.headers);
    const { id } = await context.params;
    await deleteScript(id, session.user.id);
    return {
      data: { id },
      headers: { 'Cache-Control': 'private, no-store' }
    };
  });
}
