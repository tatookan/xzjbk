import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/infrastructure/database/schema/index.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://xinzhi:xinzhi_dev@localhost:5432/xinzhi'
  },
  migrations: {
    table: '__xinzhi_migrations',
    schema: 'public'
  },
  strict: true,
  verbose: true
});
