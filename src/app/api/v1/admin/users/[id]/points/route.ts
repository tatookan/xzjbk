import { requireAdmin } from '@/modules/identity/session';
import { adjustUserPoints } from '@/modules/points/service';
import { pointsAdjustmentSchema } from '@/modules/points/validation';
import { withApiHandler } from '@/shared/api/handler';
import { assertTrustedOrigin, readJson } from '@/shared/api/request';

interface PointsRouteContext {
  params: Promise<{ id: string }>;
}

export function POST(request: Request, context: PointsRouteContext) {
  return withApiHandler(request, async () => {
    assertTrustedOrigin(request);
    const session = await requireAdmin(request.headers);
    const { id } = await context.params;
    const input = pointsAdjustmentSchema.parse(await readJson(request));
    return {
      data: await adjustUserPoints(id, input.delta, input.note, session.user.id, input.operationId),
      headers: { 'Cache-Control': 'private, no-store' }
    };
  });
}
