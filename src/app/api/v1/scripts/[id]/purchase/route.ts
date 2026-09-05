import { purchaseScript } from '@/modules/commerce/service';
import { requireSession } from '@/modules/identity/session';
import { AppError } from '@/shared/api/errors';
import { withApiHandler } from '@/shared/api/handler';
import { assertTrustedOrigin } from '@/shared/api/request';
import { assertRateLimit } from '@/shared/security/rate-limit';

interface PurchaseRouteContext {
  params: Promise<{ id: string }>;
}

export function POST(request: Request, context: PurchaseRouteContext) {
  return withApiHandler(request, async () => {
    assertTrustedOrigin(request);
    const session = await requireSession(request.headers);
    if (session.user.role !== 'member') {
      throw new AppError('FORBIDDEN', '管理员账号不能购买剧本', 403);
    }
    assertRateLimit({
      scope: 'script-purchase',
      key: session.user.id,
      max: 12,
      windowMs: 60_000
    });
    const { id } = await context.params;
    return {
      data: await purchaseScript(id, session.user.id),
      headers: { 'Cache-Control': 'private, no-store' }
    };
  });
}
