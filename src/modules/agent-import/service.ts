import { eq, and } from 'drizzle-orm';

import { getDatabase } from '@/infrastructure/database/client';
import { agentImports, auditLogs } from '@/infrastructure/database/schema';
import { AppError } from '@/shared/api/errors';

import type { AgentPrincipal } from '@/modules/agent-access/contracts';

export async function beginAgentImport(
  principal: AgentPrincipal,
  idempotencyKey: string,
  title: string
): Promise<{ id: string; existingScriptId: string | null }> {
  const database = getDatabase();
  const [created] = await database
    .insert(agentImports)
    .values({
      ownerUserId: principal.userId,
      apiKeyId: principal.apiKeyId,
      idempotencyKey,
      requestMetadata: { title, skillVersion: principal.skillVersion }
    })
    .onConflictDoNothing({
      target: [agentImports.ownerUserId, agentImports.idempotencyKey]
    })
    .returning({ id: agentImports.id });
  if (created) return { id: created.id, existingScriptId: null };

  const [existing] = await database
    .select()
    .from(agentImports)
    .where(
      and(
        eq(agentImports.ownerUserId, principal.userId),
        eq(agentImports.idempotencyKey, idempotencyKey)
      )
    );
  if (!existing) throw new AppError('CONFLICT', '导入任务状态冲突，请更换幂等编号', 409);
  if (existing.status === 'committed' && existing.scriptId) {
    return { id: existing.id, existingScriptId: existing.scriptId };
  }
  throw new AppError(
    'CONFLICT',
    existing.status === 'processing'
      ? '相同导入任务正在处理中，请勿重复提交'
      : '该导入任务此前失败，请修正后使用新的幂等编号',
    409
  );
}

export async function commitAgentImport(
  importId: string,
  scriptId: string,
  principal: AgentPrincipal
): Promise<void> {
  const database = getDatabase();
  await database.transaction(async (transaction) => {
    await transaction
      .update(agentImports)
      .set({ status: 'committed', scriptId, committedAt: new Date(), updatedAt: new Date() })
      .where(eq(agentImports.id, importId));
    await transaction.insert(auditLogs).values({
      actorUserId: principal.userId,
      action: 'agent.import.committed',
      entityType: 'script',
      entityId: scriptId,
      metadata: {
        importId,
        apiKeyId: principal.apiKeyId,
        skillVersion: principal.skillVersion,
        status: 'draft'
      }
    });
  });
}

export async function failAgentImport(importId: string, error: unknown): Promise<void> {
  const errorCode =
    error instanceof AppError
      ? error.code
      : error instanceof Error
        ? error.name.slice(0, 80)
        : 'UNKNOWN_ERROR';
  await getDatabase()
    .update(agentImports)
    .set({ status: 'failed', errorCode, updatedAt: new Date() })
    .where(eq(agentImports.id, importId));
}
