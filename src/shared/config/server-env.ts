import { z } from 'zod';

import { ConfigurationError } from '@/shared/api/errors';

const serverEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.url().default('http://localhost:3000'),
  DATABASE_URL: z.string().url().optional(),
  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  INVITE_CODE_PEPPER: z.string().min(32).optional(),
  STORAGE_DRIVER: z.enum(['local', 'oss']).default('local'),
  STORAGE_LOCAL_ROOT: z.string().min(1).default('./var/storage'),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(52_428_800),
  PAYMENT_DRIVER: z.enum(['disabled', 'alipay']).default('disabled')
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | undefined;

const PLACEHOLDER_PATTERN = /replace-with|change-me|example-secret/i;

function assertProductionEnvironment(env: ServerEnv): void {
  if (!env.DATABASE_URL) {
    throw new ConfigurationError('DATABASE_URL is required in production');
  }
  if (!env.BETTER_AUTH_SECRET || PLACEHOLDER_PATTERN.test(env.BETTER_AUTH_SECRET)) {
    throw new ConfigurationError(
      'BETTER_AUTH_SECRET must be a non-placeholder secret in production'
    );
  }
  if (!env.INVITE_CODE_PEPPER || PLACEHOLDER_PATTERN.test(env.INVITE_CODE_PEPPER)) {
    throw new ConfigurationError(
      'INVITE_CODE_PEPPER must be a non-placeholder secret in production'
    );
  }
  if (env.BETTER_AUTH_SECRET === env.INVITE_CODE_PEPPER) {
    throw new ConfigurationError('BETTER_AUTH_SECRET and INVITE_CODE_PEPPER must be different');
  }
  if (new URL(env.NEXT_PUBLIC_APP_URL).protocol !== 'https:') {
    throw new ConfigurationError('NEXT_PUBLIC_APP_URL must use HTTPS in production');
  }
  if (env.STORAGE_DRIVER !== 'local') {
    throw new ConfigurationError(
      'STORAGE_DRIVER must remain local until the OSS adapter is implemented'
    );
  }
  if (env.PAYMENT_DRIVER !== 'disabled') {
    throw new ConfigurationError(
      'PAYMENT_DRIVER must remain disabled until the Alipay adapter is implemented'
    );
  }
}

export function getServerEnv(): ServerEnv {
  if (!cachedEnv) {
    const result = serverEnvSchema.safeParse({
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      DATABASE_URL: process.env.DATABASE_URL || undefined,
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET || undefined,
      INVITE_CODE_PEPPER: process.env.INVITE_CODE_PEPPER || undefined,
      STORAGE_DRIVER: process.env.STORAGE_DRIVER,
      STORAGE_LOCAL_ROOT: process.env.STORAGE_LOCAL_ROOT,
      MAX_UPLOAD_BYTES: process.env.MAX_UPLOAD_BYTES,
      PAYMENT_DRIVER: process.env.PAYMENT_DRIVER
    });
    if (!result.success) {
      const fields = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))]
        .filter(Boolean)
        .join(', ');
      throw new ConfigurationError(`Server environment is invalid${fields ? `: ${fields}` : ''}`);
    }
    const parsedEnv = result.data;
    if (process.env.NODE_ENV === 'production') assertProductionEnvironment(parsedEnv);
    cachedEnv = parsedEnv;
  }

  return cachedEnv;
}
