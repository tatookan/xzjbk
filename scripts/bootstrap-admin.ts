import { randomUUID } from 'node:crypto';

import { hashPassword } from 'better-auth/crypto';
import { config } from 'dotenv';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { getDatabase } from '@/infrastructure/database/client';
import { accounts, users } from '@/infrastructure/database/schema';

config({ path: '.env.local' });
config();

const inputSchema = z.object({
  name: z.string().trim().min(2).max(50),
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(128)
});

async function bootstrapAdmin() {
  const input = inputSchema.parse({
    name: process.env.INITIAL_ADMIN_NAME,
    email: process.env.INITIAL_ADMIN_EMAIL,
    password: process.env.INITIAL_ADMIN_PASSWORD
  });
  const database = getDatabase();
  const [existing] = await database
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.email, input.email))
    .limit(1);

  if (existing) {
    if (existing.role !== 'admin') {
      await database
        .update(users)
        .set({ role: 'admin', updatedAt: new Date() })
        .where(eq(users.id, existing.id));
    }
    process.stdout.write(`Administrator ready: ${input.email}\n`);
    return;
  }

  const userId = randomUUID();
  const passwordHash = await hashPassword(input.password);
  const now = new Date();

  await database.transaction(async (transaction) => {
    await transaction.insert(users).values({
      id: userId,
      name: input.name,
      email: input.email,
      role: 'admin',
      pointsBalance: 0,
      discountBasisPoints: 10_000,
      createdAt: now,
      updatedAt: now
    });
    await transaction.insert(accounts).values({
      id: randomUUID(),
      userId,
      issuer: 'local:credential',
      accountId: userId,
      providerId: 'credential',
      password: passwordHash,
      createdAt: now,
      updatedAt: now
    });
  });

  process.stdout.write(`Administrator created: ${input.email}\n`);
}

bootstrapAdmin().catch((error: unknown) => {
  console.error('Unable to bootstrap administrator', error);
  process.exitCode = 1;
});
