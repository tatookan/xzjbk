import { and, eq, sql } from 'drizzle-orm';

import { getDatabase } from '@/infrastructure/database/client';
import {
  agentAccessGrants,
  agentApiKeys,
  agentImports,
  auditLogs,
  pointLedger,
  rechargeOrders,
  scriptOrders,
  scripts,
  sessions,
  users
} from '@/infrastructure/database/schema';
import { AppError } from '@/shared/api/errors';

export interface DeletedUserDto {
  id: string;
  deletedAt: string;
}

export async function deleteRegisteredUser(
  targetUserId: string,
  actorUserId: string
): Promise<DeletedUserDto> {
  const database = getDatabase();
  return database.transaction(async (transaction) => {
    if (targetUserId === actorUserId) {
      throw new AppError('CONFLICT', '不能删除当前登录的管理员账号', 409);
    }

    const [target] = await transaction
      .select()
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1)
      .for('update');
    if (!target) {
      throw new AppError('NOT_FOUND', '用户不存在', 404);
    }
    if (target.deletedAt) {
      throw new AppError('CONFLICT', '该用户已删除', 409);
    }
    if (target.role !== 'member') {
      throw new AppError('CONFLICT', '管理员账号不能删除', 409);
    }
    if (target.pointsBalance !== 0) {
      throw new AppError('CONFLICT', '该用户仍有心源余额，请先完成调账后再删除', 409);
    }

    const [ledgerCount] = await transaction
      .select({ count: sql<number>`count(*)::int` })
      .from(pointLedger)
      .where(eq(pointLedger.userId, targetUserId));
    if (ledgerCount.count > 0) {
      throw new AppError('CONFLICT', '该用户已有心源流水，不能删除', 409);
    }

    const [orderCount] = await transaction
      .select({ count: sql<number>`count(*)::int` })
      .from(scriptOrders)
      .where(eq(scriptOrders.buyerUserId, targetUserId));
    if (orderCount.count > 0) {
      throw new AppError('CONFLICT', '该用户已有剧本订单，不能删除', 409);
    }

    const [rechargeCount] = await transaction
      .select({ count: sql<number>`count(*)::int` })
      .from(rechargeOrders)
      .where(eq(rechargeOrders.userId, targetUserId));
    if (rechargeCount.count > 0) {
      throw new AppError('CONFLICT', '该用户已有充值订单，不能删除', 409);
    }

    const [soldScriptCount] = await transaction
      .select({ count: sql<number>`count(*)::int` })
      .from(scripts)
      .where(eq(scripts.soldToUserId, targetUserId));
    if (soldScriptCount.count > 0) {
      throw new AppError('CONFLICT', '该用户名下已有成交剧本，不能删除', 409);
    }

    const [agentImportCount] = await transaction
      .select({ count: sql<number>`count(*)::int` })
      .from(agentImports)
      .where(eq(agentImports.ownerUserId, targetUserId));
    if (agentImportCount.count > 0) {
      throw new AppError('CONFLICT', '该用户已有 Agent 导入记录，不能删除', 409);
    }

    await transaction.delete(sessions).where(eq(sessions.userId, targetUserId));

    await transaction
      .update(agentApiKeys)
      .set({ status: 'revoked', revokedAt: new Date() })
      .where(and(eq(agentApiKeys.ownerUserId, targetUserId), eq(agentApiKeys.status, 'active')));

    await transaction
      .update(agentAccessGrants)
      .set({ enabled: false, updatedAt: new Date() })
      .where(eq(agentAccessGrants.userId, targetUserId));

    const deletedAt = new Date();
    const [deleted] = await transaction
      .update(users)
      .set({
        name: '已注销用户',
        email: `deleted-${target.id}@users.xinsee.invalid`,
        deletedAt,
        updatedAt: deletedAt
      })
      .where(eq(users.id, targetUserId))
      .returning();

    await transaction.insert(auditLogs).values({
      actorUserId,
      action: 'user.delete',
      entityType: 'user',
      entityId: targetUserId,
      metadata: {
        previousName: target.name,
        previousEmail: target.email
      }
    });

    return { id: deleted.id, deletedAt: deleted.deletedAt!.toISOString() };
  });
}
