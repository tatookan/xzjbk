import { z } from 'zod';

import { revokeInviteCode } from '@/modules/identity/invite-code';
import { requireAdmin } from '@/modules/identity/session';
import { withApiHandler } from '@/shared/api/handler';
import { assertTrustedOrigin } from '@/shared/api/request';

const paramsSchema = z.object({ id: z.uuid() });

export function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  return withApiHandler(request, async () => {
    assertTrustedOrigin(request);
    await requireAdmin(request.headers);
    const { id } = paramsSchema.parse(await context.params);
    await revokeInviteCode(id);
    return { data: { revoked: true } };
  });
}
