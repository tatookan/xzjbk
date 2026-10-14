import { getShowcaseSettings, listPublishedPosters } from '@/modules/showcase/service';
import { withApiHandler } from '@/shared/api/handler';

export function GET(request: Request) {
  return withApiHandler(request, async () => {
    const [items, settings] = await Promise.all([listPublishedPosters(), getShowcaseSettings()]);
    return { data: { items, settings } };
  });
}
