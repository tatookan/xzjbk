import { withApiHandler } from '@/shared/api/handler';
import { getServerEnv } from '@/shared/config/server-env';

export function GET(request: Request) {
  return withApiHandler(request, () => {
    const env = getServerEnv();
    return {
      data: {
        status: 'ok',
        database: { configured: Boolean(env.DATABASE_URL) },
        storage: { driver: env.STORAGE_DRIVER }
      }
    };
  });
}
