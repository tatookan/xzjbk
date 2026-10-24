import { requireAdmin } from '@/modules/identity/session';
import { deleteRegisteredUser } from '@/modules/identity/user-administration';
import { withApiHandler } from '@/shared/api/handler';
import { assertTrustedOrigin } from '@/shared/api/request';

interface UserRouteContext {
  params: Promise<{ id: string }>;
}

export function DELETE(request: Request, context: UserRouteContext) {
  return withApiHandler(request, async () => {
    assertTrustedOrigin(request);
    const session = await requireAdmin(request.headers);
    const { id } = await context.params;
    return {
      data: await deleteRegisteredUser(id, session.user.id),
      headers: { 'Cache-Control': 'private, no-store' }
    };
  });
}
