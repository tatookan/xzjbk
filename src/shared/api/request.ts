import { AppError } from './errors';

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError('BAD_REQUEST', '请求内容不是有效的 JSON', 400);
  }
}

export function assertTrustedOrigin(request: Request): void {
  const origin = request.headers.get('origin');
  if (!origin) return;

  try {
    const expectedOrigin = new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')
      .origin;
    if (new URL(origin).origin !== expectedOrigin) {
      throw new AppError('FORBIDDEN', '请求来源不受信任', 403);
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('FORBIDDEN', '请求来源不受信任', 403);
  }
}
