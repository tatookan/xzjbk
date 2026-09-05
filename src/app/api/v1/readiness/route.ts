import { sql } from 'drizzle-orm';

import { getDatabase } from '@/infrastructure/database/client';
import { getStorageProvider } from '@/infrastructure/storage';
import { AppError } from '@/shared/api/errors';
import { withApiHandler } from '@/shared/api/handler';

export const runtime = 'nodejs';

export function GET(request: Request) {
  return withApiHandler(request, async () => {
    try {
      await getDatabase().execute(sql`select 1`);
      const storage = await getStorageProvider().healthCheck();

      return {
        data: {
          status: 'ready',
          database: { healthy: true },
          storage
        }
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('Readiness check failed', { error });
      throw new AppError('SERVICE_UNAVAILABLE', '服务依赖尚未就绪', 503);
    }
  });
}
