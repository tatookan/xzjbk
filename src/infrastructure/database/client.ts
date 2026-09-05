import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { ConfigurationError } from '@/shared/api/errors';
import { getServerEnv } from '@/shared/config/server-env';

import * as schema from './schema';

function createDatabase() {
  const { DATABASE_URL } = getServerEnv();
  if (!DATABASE_URL) {
    throw new ConfigurationError('DATABASE_URL is not configured');
  }

  const client = postgres(DATABASE_URL, {
    max: 10,
    prepare: false,
    idle_timeout: 20
  });

  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDatabase>;

let database: Database | undefined;

export function getDatabase(): Database {
  database ??= createDatabase();
  return database;
}
