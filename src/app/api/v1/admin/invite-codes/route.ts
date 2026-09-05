import { generateInviteCode, listInviteCodes } from '@/modules/identity/invite-code';
import { requireAdmin } from '@/modules/identity/session';
import { withApiHandler } from '@/shared/api/handler';
import { assertTrustedOrigin } from '@/shared/api/request';

export function GET(request: Request) {
  return withApiHandler(request, async () => {
    await requireAdmin(request.headers);
    return { data: { items: await listInviteCodes() } };
  });
}

export function POST(request: Request) {
  return withApiHandler(request, async () => {
    assertTrustedOrigin(request);
    const session = await requireAdmin(request.headers);
    const invitation = await generateInviteCode(session.user.id);
    return { data: { invitation }, status: 201 };
  });
}
