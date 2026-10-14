import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import { and, desc, eq, gt, isNull, sql } from 'drizzle-orm';

import { getDatabase } from '@/infrastructure/database/client';
import {
  agentAccessGrants,
  agentApiKeys,
  agentApiRateLimits,
  agentImports,
  auditLogs,
  scripts,
  users
} from '@/infrastructure/database/schema';
import { AppError } from '@/shared/api/errors';

import type {
  AgentAccessUserDto,
  AgentApiKeyDto,
  AgentImportDto,
  AgentPrincipal
} from './contracts';
import { AGENT_SKILL_VERSION } from './version';

const KEY_PATTERN = /^xz_agent_([a-f0-9]{16})_([A-Za-z0-9_-]{43})$/;

function hashKey(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function safeHashEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export async function listAgentAccessUsers(): Promise<AgentAccessUserDto[]> {
  const database = getDatabase();
  const rows = await database
    .select({ user: users, grant: agentAccessGrants })
    .from(users)
    .leftJoin(agentAccessGrants, eq(users.id, agentAccessGrants.userId))
    .orderBy(desc(users.createdAt));
  const keyCounts = await database
    .select({ ownerUserId: agentApiKeys.ownerUserId, count: sql<number>`count(*)::int` })
    .from(agentApiKeys)
    .where(and(eq(agentApiKeys.status, 'active'), gt(agentApiKeys.expiresAt, new Date())))
    .groupBy(agentApiKeys.ownerUserId);
  const countByUser = new Map(keyCounts.map((row) => [row.ownerUserId, row.count]));
  return rows.map(({ user, grant }) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    enabled: grant?.enabled ?? false,
    grantedAt: grant?.grantedAt.toISOString() ?? null,
    activeKeyCount: countByUser.get(user.id) ?? 0
  }));
}

export async function setAgentAccess(
  userId: string,
  enabled: boolean,
  actorUserId: string
): Promise<void> {
  const database = getDatabase();
  await database.transaction(async (transaction) => {
    const [user] = await transaction
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId));
    if (!user) throw new AppError('NOT_FOUND', '用户不存在', 404);
    await transaction
      .insert(agentAccessGrants)
      .values({ userId, enabled, grantedByUserId: actorUserId })
      .onConflictDoUpdate({
        target: agentAccessGrants.userId,
        set: { enabled, grantedByUserId: actorUserId, updatedAt: new Date() }
      });
    if (!enabled) {
      await transaction
        .update(agentApiKeys)
        .set({ status: 'revoked', revokedAt: new Date() })
        .where(and(eq(agentApiKeys.ownerUserId, userId), eq(agentApiKeys.status, 'active')));
    }
    await transaction.insert(auditLogs).values({
      actorUserId,
      action: enabled ? 'agent.access.granted' : 'agent.access.revoked',
      entityType: 'user',
      entityId: userId,
      metadata: { enabled }
    });
  });
}

function apiKeyDto(row: {
  key: typeof agentApiKeys.$inferSelect;
  owner: Pick<typeof users.$inferSelect, 'name' | 'email'>;
}): AgentApiKeyDto {
  return {
    id: row.key.id,
    ownerUserId: row.key.ownerUserId,
    ownerName: row.owner.name,
    ownerEmail: row.owner.email,
    name: row.key.name,
    keyHint: `xz_agent_${row.key.keyPrefix.slice(0, 6)}…`,
    status: row.key.status,
    expired: row.key.expiresAt.getTime() <= Date.now(),
    expiresAt: row.key.expiresAt.toISOString(),
    lastUsedAt: row.key.lastUsedAt?.toISOString() ?? null,
    lastUsedIp: row.key.lastUsedIp,
    lastSkillVersion: row.key.lastSkillVersion,
    createdAt: row.key.createdAt.toISOString(),
    revokedAt: row.key.revokedAt?.toISOString() ?? null
  };
}

export async function listAgentApiKeys(): Promise<AgentApiKeyDto[]> {
  const rows = await getDatabase()
    .select({ key: agentApiKeys, owner: { name: users.name, email: users.email } })
    .from(agentApiKeys)
    .innerJoin(users, eq(agentApiKeys.ownerUserId, users.id))
    .orderBy(desc(agentApiKeys.createdAt));
  return rows.map(apiKeyDto);
}

export async function createAgentApiKey(input: {
  ownerUserId: string;
  name: string;
  expiresInDays: number;
  actorUserId: string;
}): Promise<{ item: AgentApiKeyDto; secret: string }> {
  const database = getDatabase();
  const [authorization] = await database
    .select({ user: users, grant: agentAccessGrants })
    .from(users)
    .innerJoin(agentAccessGrants, eq(users.id, agentAccessGrants.userId))
    .where(and(eq(users.id, input.ownerUserId), eq(agentAccessGrants.enabled, true)));
  if (!authorization) {
    throw new AppError('CONFLICT', '请先为该用户开通 Agent 灰度权限', 409);
  }
  const prefix = randomBytes(8).toString('hex');
  const secretPart = randomBytes(32).toString('base64url');
  const secret = `xz_agent_${prefix}_${secretPart}`;
  const expiresAt = new Date(Date.now() + input.expiresInDays * 86_400_000);
  const [key] = await database
    .insert(agentApiKeys)
    .values({
      ownerUserId: input.ownerUserId,
      createdByUserId: input.actorUserId,
      name: input.name,
      keyPrefix: prefix,
      keyHash: hashKey(secret),
      expiresAt
    })
    .returning();
  await database.insert(auditLogs).values({
    actorUserId: input.actorUserId,
    action: 'agent.key.created',
    entityType: 'agent-api-key',
    entityId: key.id,
    metadata: {
      ownerUserId: input.ownerUserId,
      name: input.name,
      expiresAt: expiresAt.toISOString()
    }
  });
  return {
    item: apiKeyDto({ key, owner: authorization.user }),
    secret
  };
}

export async function revokeAgentApiKey(id: string, actorUserId: string): Promise<void> {
  const database = getDatabase();
  const [key] = await database
    .update(agentApiKeys)
    .set({ status: 'revoked', revokedAt: new Date() })
    .where(and(eq(agentApiKeys.id, id), eq(agentApiKeys.status, 'active')))
    .returning({ id: agentApiKeys.id, ownerUserId: agentApiKeys.ownerUserId });
  if (!key) throw new AppError('NOT_FOUND', 'Key不存在或已经撤销', 404);
  await database.insert(auditLogs).values({
    actorUserId,
    action: 'agent.key.revoked',
    entityType: 'agent-api-key',
    entityId: id,
    metadata: { ownerUserId: key.ownerUserId }
  });
}

export async function authenticateAgentRequest(request: Request): Promise<AgentPrincipal> {
  const authorization = request.headers.get('authorization') ?? '';
  const rawKey = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  const match = KEY_PATTERN.exec(rawKey);
  if (!match) throw new AppError('UNAUTHORIZED', '缺少有效的 Agent API Key', 401);
  const skillVersion = request.headers.get('x-xinzhi-skill-version') ?? '';
  if (skillVersion !== AGENT_SKILL_VERSION) {
    throw new AppError('UPGRADE_REQUIRED', 'Skill版本与剧本库不一致，请先运行官方更新', 426, {
      requiredSkillVersion: AGENT_SKILL_VERSION
    });
  }
  const [row] = await getDatabase()
    .select({ key: agentApiKeys, user: users, grant: agentAccessGrants })
    .from(agentApiKeys)
    .innerJoin(users, eq(agentApiKeys.ownerUserId, users.id))
    .innerJoin(agentAccessGrants, eq(agentApiKeys.ownerUserId, agentAccessGrants.userId))
    .where(
      and(
        eq(agentApiKeys.keyPrefix, match[1]),
        eq(agentApiKeys.status, 'active'),
        eq(agentAccessGrants.enabled, true),
        isNull(agentApiKeys.revokedAt),
        gt(agentApiKeys.expiresAt, new Date())
      )
    );
  if (!row || !safeHashEqual(hashKey(rawKey), row.key.keyHash)) {
    throw new AppError('UNAUTHORIZED', 'Agent API Key无效、过期或已撤销', 401);
  }
  const address =
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  await getDatabase()
    .update(agentApiKeys)
    .set({
      lastUsedAt: new Date(),
      lastUsedIp: address && /^[a-fA-F0-9.:]{1,64}$/.test(address) ? address : null,
      lastSkillVersion: skillVersion
    })
    .where(eq(agentApiKeys.id, row.key.id));
  return {
    apiKeyId: row.key.id,
    userId: row.user.id,
    userName: row.user.name,
    userEmail: row.user.email,
    skillVersion
  };
}

export async function assertAgentRateLimit(input: {
  apiKeyId: string;
  scope: string;
  max: number;
  windowMs: number;
}): Promise<void> {
  const now = Date.now();
  const windowStartedAt = new Date(Math.floor(now / input.windowMs) * input.windowMs);
  const [bucket] = await getDatabase()
    .insert(agentApiRateLimits)
    .values({
      apiKeyId: input.apiKeyId,
      scope: input.scope,
      windowStartedAt,
      count: 1
    })
    .onConflictDoUpdate({
      target: [
        agentApiRateLimits.apiKeyId,
        agentApiRateLimits.scope,
        agentApiRateLimits.windowStartedAt
      ],
      set: {
        count: sql`${agentApiRateLimits.count} + 1`,
        updatedAt: new Date()
      }
    })
    .returning({ count: agentApiRateLimits.count });
  if (bucket.count > input.max) {
    const resetAt = windowStartedAt.getTime() + input.windowMs;
    throw new AppError('RATE_LIMITED', 'Agent请求过于频繁，请按提示时间后重试', 429, {
      retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000))
    });
  }
}

export async function listAgentImports(): Promise<AgentImportDto[]> {
  const rows = await getDatabase()
    .select({
      item: agentImports,
      owner: { name: users.name, email: users.email },
      scriptTitle: scripts.title
    })
    .from(agentImports)
    .innerJoin(users, eq(agentImports.ownerUserId, users.id))
    .leftJoin(scripts, eq(agentImports.scriptId, scripts.id))
    .orderBy(desc(agentImports.createdAt))
    .limit(100);
  return rows.map(({ item, owner, scriptTitle }) => ({
    id: item.id,
    ownerName: owner.name,
    ownerEmail: owner.email,
    status: item.status,
    scriptId: item.scriptId,
    scriptTitle,
    errorCode: item.errorCode,
    skillVersion:
      typeof item.requestMetadata.skillVersion === 'string'
        ? item.requestMetadata.skillVersion
        : null,
    createdAt: item.createdAt.toISOString(),
    committedAt: item.committedAt?.toISOString() ?? null
  }));
}
