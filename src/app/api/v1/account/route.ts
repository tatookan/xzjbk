import { requireSession } from '@/modules/identity/session';
import { getAccountPoints } from '@/modules/points/service';
import { withApiHandler } from '@/shared/api/handler';

export function GET(request: Request) {
  return withApiHandler(request, async () => {
    const session = await requireSession(request.headers);
    return {
      data: await getAccountPoints(session.user.id),
      headers: { 'Cache-Control': 'private, no-store' }
    };
  });
}
