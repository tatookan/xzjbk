import { requireAdmin } from '@/modules/identity/session';
import { listPointsUsers } from '@/modules/points/service';
import { withApiHandler } from '@/shared/api/handler';

export function GET(request: Request) {
  return withApiHandler(request, async () => {
    await requireAdmin(request.headers);
    return {
      data: { items: await listPointsUsers() },
      headers: { 'Cache-Control': 'private, no-store' }
    };
  });
}
