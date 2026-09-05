import { listPublicScripts } from '@/modules/script-catalog/service';
import { withApiHandler } from '@/shared/api/handler';

export function GET(request: Request) {
  return withApiHandler(request, async () => ({ data: { items: await listPublicScripts() } }));
}
