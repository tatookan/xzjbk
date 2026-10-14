import { requireAdmin } from '@/modules/identity/session';
import { updateShowcaseSettings } from '@/modules/showcase/service';
import { showcaseSettingsInputSchema } from '@/modules/showcase/validation';
import { withApiHandler } from '@/shared/api/handler';
import { assertTrustedOrigin, readJson } from '@/shared/api/request';

export function PATCH(request: Request) {
  return withApiHandler(request, async () => {
    assertTrustedOrigin(request);
    const session = await requireAdmin(request.headers);
    const input = showcaseSettingsInputSchema.parse(await readJson(request));
    const settings = await updateShowcaseSettings(input.reelSpeedPxPerSecond, session.user.id);
    return { data: { settings } };
  });
}
