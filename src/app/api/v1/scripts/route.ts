import { listPublicScripts } from '@/modules/script-catalog/service';
import { withApiHandler } from '@/shared/api/handler';

export function GET(request: Request) {
  return withApiHandler(request, async () => {
    const url = new URL(request.url);
    const market = url.searchParams.get('market');
    if (market === 'domestic' || market === 'overseas') {
      return { data: { items: await listPublicScripts(market) } };
    }
    return { data: { items: await listPublicScripts() } };
  });
}
