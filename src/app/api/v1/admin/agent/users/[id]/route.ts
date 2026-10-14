import { z } from 'zod';

import { setAgentAccess } from '@/modules/agent-access/service';
import { requireAdmin } from '@/modules/identity/session';
import { withApiHandler } from '@/shared/api/handler';
import { assertTrustedOrigin } from '@/shared/api/request';

const inputSchema = z.object({ enabled: z.boolean() });

interface AgentUserRouteContext {
  params: Promise<{ id: string }>;
}

export function PATCH(request: Request, context: AgentUserRouteContext) {
  return withApiHandler(request, async () => {
    assertTrustedOrigin(request);
    const session = await requireAdmin(request.headers);
    const { id } = await context.params;
    const input = inputSchema.parse(await request.json());
    await setAgentAccess(id, input.enabled, session.user.id);
    return { data: { enabled: input.enabled }, headers: { 'Cache-Control': 'private, no-store' } };
  });
}
