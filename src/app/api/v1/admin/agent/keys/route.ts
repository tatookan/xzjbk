import { z } from 'zod';

import { createAgentApiKey } from '@/modules/agent-access/service';
import { requireAdmin } from '@/modules/identity/session';
import { withApiHandler } from '@/shared/api/handler';
import { assertTrustedOrigin } from '@/shared/api/request';
import { getServerEnv } from '@/shared/config/server-env';
import { AGENT_API_VERSION, AGENT_SKILL_VERSION } from '@/modules/agent-access/version';

const inputSchema = z.object({
  ownerUserId: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  expiresInDays: z.number().int().min(1).max(365).default(90)
});

export function POST(request: Request) {
  return withApiHandler(request, async () => {
    assertTrustedOrigin(request);
    const session = await requireAdmin(request.headers);
    const input = inputSchema.parse(await request.json());
    const result = await createAgentApiKey({ ...input, actorUserId: session.user.id });
    return {
      data: {
        item: result.item,
        secret: result.secret,
        connection: {
          server: getServerEnv().NEXT_PUBLIC_APP_URL,
          apiVersion: AGENT_API_VERSION,
          skillVersion: AGENT_SKILL_VERSION,
          apiKey: result.secret
        }
      },
      status: 201,
      headers: { 'Cache-Control': 'private, no-store' }
    };
  });
}
