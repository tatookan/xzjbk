import { getAuth, type AuthSession } from './auth';
import { AppError } from '@/shared/api/errors';

export async function getSession(requestHeaders: Headers): Promise<AuthSession | null> {
  return getAuth().api.getSession({ headers: requestHeaders });
}

export async function requireSession(requestHeaders: Headers): Promise<AuthSession> {
  const session = await getSession(requestHeaders);
  if (!session) {
    throw new AppError('UNAUTHORIZED', '请先登录剧本库', 401);
  }
  return session;
}

export async function requireAdmin(requestHeaders: Headers): Promise<AuthSession> {
  const session = await requireSession(requestHeaders);
  if (session.user.role !== 'admin') {
    throw new AppError('FORBIDDEN', '仅管理员可以执行此操作', 403);
  }
  return session;
}
