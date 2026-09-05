import { deletePoster, updatePoster } from '@/modules/showcase/service';
import { preparePosterImage, readPosterFile } from '@/modules/showcase/poster-image';
import { readPosterInput } from '@/modules/showcase/validation';
import { requireAdmin } from '@/modules/identity/session';
import { withApiHandler } from '@/shared/api/handler';
import { assertTrustedOrigin } from '@/shared/api/request';

interface PosterRouteContext {
  params: Promise<{ id: string }>;
}

export function PATCH(request: Request, context: PosterRouteContext) {
  return withApiHandler(request, async () => {
    assertTrustedOrigin(request);
    const session = await requireAdmin(request.headers);
    const { id } = await context.params;
    const formData = await request.formData();
    const input = readPosterInput(formData);
    const file = readPosterFile(formData, false);
    const replacement = file ? await preparePosterImage(file) : null;
    const poster = await updatePoster(id, input, replacement, session.user.id);
    return { data: { poster } };
  });
}

export function DELETE(request: Request, context: PosterRouteContext) {
  return withApiHandler(request, async () => {
    assertTrustedOrigin(request);
    const session = await requireAdmin(request.headers);
    const { id } = await context.params;
    await deletePoster(id, session.user.id);
    return { data: { id } };
  });
}
