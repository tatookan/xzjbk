import { getServerEnv } from '@/shared/config/server-env';

import { AppError } from './errors';

export function readExpectedVersion(request: Request): number {
  const match = /^"([1-9][0-9]*)"$/.exec(request.headers.get('if-match') ?? '');
  const version = match ? Number(match[1]) : NaN;
  if (!Number.isSafeInteger(version)) {
    throw new AppError('CONFLICT', '请刷新剧本资料后重试', 428);
  }
  return version;
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError('BAD_REQUEST', '请求内容不是有效的 JSON', 400);
  }
}

export function getTrustedOrigins(): string[] {
  const configuredUrl = new URL(getServerEnv().NEXT_PUBLIC_APP_URL);
  const configured = configuredUrl.origin;
  const wwwVariant = `${configuredUrl.protocol}//www.${configuredUrl.host}`;
  return Array.from(
    new Set([configured, wwwVariant, 'https://drama.xinsee.cc:8443', 'https://xinsee.cc:8443'])
  );
}

export function assertTrustedOrigin(request: Request): void {
  if (request.headers.get('sec-fetch-site') === 'cross-site') {
    throw new AppError('FORBIDDEN', '请求来源不受信任', 403);
  }

  const origin = request.headers.get('origin');
  if (!origin) return;

  try {
    const requestedOrigin = new URL(origin).origin;
    if (!getTrustedOrigins().includes(requestedOrigin)) {
      throw new AppError('FORBIDDEN', '请求来源不受信任', 403);
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('FORBIDDEN', '请求来源不受信任', 403);
  }
}
