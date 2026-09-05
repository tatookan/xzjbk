import { requireSession } from '@/modules/identity/session';
import { getScriptDetail } from '@/modules/script-catalog/service';
import { withApiHandler } from '@/shared/api/handler';

interface ScriptRouteContext {
  params: Promise<{ id: string }>;
}

export function GET(request: Request, context: ScriptRouteContext) {
  return withApiHandler(request, async () => {
    const session = await requireSession(request.headers);
    const { id } = await context.params;
    const script = await getScriptDetail(id, session.user.role, session.user.id);
    return {
      data: { script },
      headers: { 'Cache-Control': 'private, no-store' }
    };
  });
}
