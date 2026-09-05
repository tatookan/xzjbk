import { z } from 'zod';

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
  STORAGE_DRIVER: z.enum(['local', 'oss']).default('local'),
  STORAGE_LOCAL_ROOT: z.string().min(1).default('./var/storage'),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(52_428_800)
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  cachedEnv ??= serverEnvSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL || undefined,
    STORAGE_DRIVER: process.env.STORAGE_DRIVER,
    STORAGE_LOCAL_ROOT: process.env.STORAGE_LOCAL_ROOT,
    MAX_UPLOAD_BYTES: process.env.MAX_UPLOAD_BYTES
  });

  return cachedEnv;
}
