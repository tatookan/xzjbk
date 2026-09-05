import { withApiHandler } from '@/shared/api/handler';

export function GET(request: Request) {
  return withApiHandler(request, () => ({
    data: {
      service: 'xinzhi-script-library',
      version: 'v1',
      endpoints: {
        health: '/api/v1/health',
        readiness: '/api/v1/readiness'
      }
    }
  }));
}
