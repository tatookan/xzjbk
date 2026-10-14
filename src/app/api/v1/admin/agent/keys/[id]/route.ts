import { revokeAgentApiKey } from '@/modules/agent-access/service';
import { requireAdmin } from '@/modules/identity/session';
import { withApiHandler } from '@/shared/api/handler';
import { assertTrustedOrigin } from '@/shared/api/request';

interface AgentKeyRouteContext {
  params: Promise<{ id: string }>;
}

export function DELETE(request: Request, context: AgentKeyRouteContext) {
  return withApiHandler(request, async () => {
    assertTrustedOrigin(request);
    const session = await requireAdmin(request.headers);
    const { id } = await context.params;
    await revokeAgentApiKey(id, session.user.id);
    return { data: { revoked: true }, headers: { 'Cache-Control': 'private, no-store' } };
  });
}
