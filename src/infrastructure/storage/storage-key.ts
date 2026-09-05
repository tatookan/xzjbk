import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

const SAFE_SCOPE = /^[a-z0-9][a-z0-9/-]{0,79}$/;

export function createStorageKey(scope: string, originalName: string): string {
  if (!SAFE_SCOPE.test(scope) || scope.includes('..') || scope.endsWith('/')) {
    throw new Error('Invalid storage scope');
  }

  const now = new Date();
  const extension = extname(originalName)
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, '')
    .slice(0, 12);
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');

  return `${scope}/${year}/${month}/${randomUUID()}${extension}`;
}
