import { createPoster, listAdminPosters, reorderPosters } from '@/modules/showcase/service';
import { preparePosterImage, readPosterFile } from '@/modules/showcase/poster-image';
import { readPosterInput, reorderPostersSchema } from '@/modules/showcase/validation';
import { requireAdmin } from '@/modules/identity/session';
import { withApiHandler } from '@/shared/api/handler';
import { assertTrustedOrigin, readJson } from '@/shared/api/request';

export function GET(request: Request) {
  return withApiHandler(request, async () => {
    await requireAdmin(request.headers);
    return { data: { items: await listAdminPosters() } };
  });
}

export function POST(request: Request) {
  return withApiHandler(request, async () => {
    assertTrustedOrigin(request);
    const session = await requireAdmin(request.headers);
    const formData = await request.formData();
    const input = readPosterInput(formData);
    const image = await preparePosterImage(readPosterFile(formData, true)!);
    const poster = await createPoster(input, image, session.user.id);
    return { data: { poster }, status: 201 };
  });
}

export function PATCH(request: Request) {
  return withApiHandler(request, async () => {
    assertTrustedOrigin(request);
    const session = await requireAdmin(request.headers);
    const { orderedIds } = reorderPostersSchema.parse(await readJson(request));
    await reorderPosters(orderedIds, session.user.id);
    return { data: { orderedIds } };
  });
}
