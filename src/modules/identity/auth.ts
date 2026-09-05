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
    baseURL: env.NEXT_PUBLIC_APP_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.NEXT_PUBLIC_APP_URL],
    rateLimit: {
      enabled: true,
      storage: 'memory',
      window: 60,
      max: 60,
      customRules: {
        '/sign-in/email': { window: 60, max: 8 },
        '/change-password': { window: 60, max: 5 }
      }
    },
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
      cookiePrefix: 'xinzhi',
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
