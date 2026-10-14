import { requireAdmin } from '@/modules/identity/session';
import {
  listAgentAccessUsers,
  listAgentApiKeys,
  listAgentImports
} from '@/modules/agent-access/service';
import { withApiHandler } from '@/shared/api/handler';

export function GET(request: Request) {
  return withApiHandler(request, async () => {
    await requireAdmin(request.headers);
    const [users, keys, imports] = await Promise.all([
      listAgentAccessUsers(),
      listAgentApiKeys(),
      listAgentImports()
    ]);
    return {
      data: { users, keys, imports },
      headers: { 'Cache-Control': 'private, no-store' }
    };
  });
}
