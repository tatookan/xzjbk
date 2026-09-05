import { AppError } from '@/shared/api/errors';

interface RateLimitInput {
  scope: string;
  key: string;
  max: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const MAX_TRACKED_KEYS = 10_000;
const buckets = new Map<string, RateLimitEntry>();
let lastSweepAt = 0;

function sweepExpired(now: number): void {
  if (now - lastSweepAt < 60_000 && buckets.size < MAX_TRACKED_KEYS) return;
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) buckets.delete(key);
  }
  lastSweepAt = now;
}

export function getClientAddress(request: Request): string {
  const value =
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';
  return /^[a-fA-F0-9.:]{1,64}$/.test(value) ? value : 'unknown';
}

export function assertRateLimit({ scope, key, max, windowMs }: RateLimitInput): void {
  const now = Date.now();
  sweepExpired(now);
  const bucketKey = `${scope}:${key}`;
  const current = buckets.get(bucketKey);

  if (!current || current.resetAt <= now) {
    if (buckets.size >= MAX_TRACKED_KEYS) {
      throw new AppError('RATE_LIMITED', '请求过于频繁，请稍后再试', 429);
    }
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (current.count >= max) {
    throw new AppError('RATE_LIMITED', '请求过于频繁，请稍后再试', 429, {
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000))
    });
  }
  current.count += 1;
}
