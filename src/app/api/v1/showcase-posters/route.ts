import { listPublishedPosters } from '@/modules/showcase/service';
import { withApiHandler } from '@/shared/api/handler';

export function GET(request: Request) {
  return withApiHandler(request, async () => ({
    data: { items: await listPublishedPosters() }
  }));
}
