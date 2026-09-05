import { listAdminOrders } from '@/modules/commerce/service';
import { requireAdmin } from '@/modules/identity/session';
import { withApiHandler } from '@/shared/api/handler';

export function GET(request: Request) {
  return withApiHandler(request, async () => {
    await requireAdmin(request.headers);
    return {
      data: { items: await listAdminOrders() },
      headers: { 'Cache-Control': 'private, no-store' }
    };
  });
}
