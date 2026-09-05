import { requireSession } from '@/modules/identity/session';
import { listRechargePlans } from '@/modules/points/service';
import { withApiHandler } from '@/shared/api/handler';

export function GET(request: Request) {
  return withApiHandler(request, async () => {
    await requireSession(request.headers);
    return {
      data: { items: await listRechargePlans() },
      headers: { 'Cache-Control': 'private, no-store' }
    };
  });
}
