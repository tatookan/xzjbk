import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';

import { getDatabase } from '@/infrastructure/database/client';
import { accounts, sessions, users, verifications } from '@/infrastructure/database/schema';
import { ConfigurationError } from '@/shared/api/errors';
import { getServerEnv } from '@/shared/config/server-env';

function createAuth() {
  const env = getServerEnv();
  if (!env.BETTER_AUTH_SECRET) {
    throw new ConfigurationError('BETTER_AUTH_SECRET is not configured');
  }

  return betterAuth({
    appName: '心智剧本库',
    baseURL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'],
    database: drizzleAdapter(getDatabase(), {
      provider: 'pg',
      schema: {
        user: users,
        session: sessions,
        account: accounts,
        verification: verifications
      }
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 8,
      maxPasswordLength: 128
    },
    user: {
      additionalFields: {
        role: {
          type: ['member', 'admin'],
          required: true,
          defaultValue: 'member',
          input: false
        },
        pointsBalance: {
          type: 'number',
          required: true,
          defaultValue: 0,
          input: false
        }
      }
    },
    advanced: {
      database: {
        generateId: () => crypto.randomUUID()
      }
    },
    telemetry: { enabled: false }
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type AuthSession = Auth['$Infer']['Session'];

let auth: Auth | undefined;

export function getAuth(): Auth {
  auth ??= createAuth();
  return auth;
}
