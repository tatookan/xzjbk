import { createHmac, randomBytes, randomUUID } from 'node:crypto';

import { and, desc, eq } from 'drizzle-orm';

import { getDatabase } from '@/infrastructure/database/client';
import { accounts, inviteCodes, users } from '@/infrastructure/database/schema';
import { AppError, ConfigurationError } from '@/shared/api/errors';
import { getServerEnv } from '@/shared/config/server-env';

import { CURRENT_PRIVACY_VERSION, CURRENT_TERMS_VERSION } from './policies';

export interface InviteRegistrationInput {
  name: string;
  email: string;
  passwordHash: string;
  inviteCode: string;
  acceptedPolicies: true;
}

function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase();
}

export function hashInviteCode(code: string): string {
  const { INVITE_CODE_PEPPER } = getServerEnv();
  if (!INVITE_CODE_PEPPER) {
    throw new ConfigurationError('INVITE_CODE_PEPPER is not configured');
  }

  return createHmac('sha256', INVITE_CODE_PEPPER).update(normalizeInviteCode(code)).digest('hex');
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Error && (error as Error & { code?: string }).code === '23505';
}

export async function registerWithInvite(
  input: InviteRegistrationInput
): Promise<{ id: string; name: string; email: string }> {
  if (!input.acceptedPolicies) {
    throw new AppError('BAD_REQUEST', '请先阅读并同意用户协议和隐私政策', 400);
  }
  const database = getDatabase();
  const email = input.email.trim().toLowerCase();
  const inviteHash = hashInviteCode(input.inviteCode);
  const userId = randomUUID();
  const now = new Date();

  try {
    return await database.transaction(async (transaction) => {
      const [invitation] = await transaction
        .select({ id: inviteCodes.id })
        .from(inviteCodes)
        .where(and(eq(inviteCodes.codeHash, inviteHash), eq(inviteCodes.status, 'unused')))
        .limit(1)
        .for('update');

      if (!invitation) {
        throw new AppError('BAD_REQUEST', '注册码无效、已使用或已被撤销', 400);
      }

      await transaction.insert(users).values({
        id: userId,
        name: input.name.trim(),
        email,
        role: 'member',
        pointsBalance: 0,
        termsAcceptedAt: now,
        termsVersion: CURRENT_TERMS_VERSION,
        privacyAcceptedAt: now,
        privacyVersion: CURRENT_PRIVACY_VERSION,
        createdAt: now,
        updatedAt: now
      });

      await transaction.insert(accounts).values({
        id: randomUUID(),
        userId,
        issuer: 'local:credential',
        accountId: userId,
        providerId: 'credential',
        password: input.passwordHash,
        createdAt: now,
        updatedAt: now
      });

      await transaction
        .update(inviteCodes)
        .set({
          status: 'used',
          usedByUserId: userId,
          usedAt: now,
          updatedAt: now
        })
        .where(eq(inviteCodes.id, invitation.id));

      return { id: userId, name: input.name.trim(), email };
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (isUniqueViolation(error)) {
      throw new AppError('CONFLICT', '该邮箱已经注册', 409);
    }
    throw error;
  }
}

export async function generateInviteCode(createdByUserId: string) {
  const database = getDatabase();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const code = `XINZHI-${randomBytes(12).toString('hex').toUpperCase()}`;
    try {
      const [created] = await database
        .insert(inviteCodes)
        .values({
          codeHash: hashInviteCode(code),
          codeHint: `…${code.slice(-6)}`,
          createdByUserId
        })
        .returning({
          id: inviteCodes.id,
          status: inviteCodes.status,
          codeHint: inviteCodes.codeHint,
          createdAt: inviteCodes.createdAt
        });

      return { ...created, code };
    } catch (error) {
      if (!isUniqueViolation(error) || attempt === 2) throw error;
    }
  }

  throw new AppError('INTERNAL_ERROR', '无法生成注册码', 500);
}

export function listInviteCodes() {
  return getDatabase()
    .select({
      id: inviteCodes.id,
      status: inviteCodes.status,
      codeHint: inviteCodes.codeHint,
      createdAt: inviteCodes.createdAt,
      usedAt: inviteCodes.usedAt,
      usedByUserId: inviteCodes.usedByUserId,
      usedByName: users.name,
      usedByEmail: users.email
    })
    .from(inviteCodes)
    .leftJoin(users, eq(inviteCodes.usedByUserId, users.id))
    .orderBy(desc(inviteCodes.createdAt));
}

export async function revokeInviteCode(id: string): Promise<void> {
  const [revoked] = await getDatabase()
    .update(inviteCodes)
    .set({ status: 'revoked', updatedAt: new Date() })
    .where(and(eq(inviteCodes.id, id), eq(inviteCodes.status, 'unused')))
    .returning({ id: inviteCodes.id });

  if (!revoked) {
    throw new AppError('CONFLICT', '注册码不存在，或当前状态不能撤销', 409);
  }
}
