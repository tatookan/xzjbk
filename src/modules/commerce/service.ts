import { randomBytes } from 'node:crypto';

import { and, desc, eq, isNull } from 'drizzle-orm';

import { getDatabase } from '@/infrastructure/database/client';
import {
  auditLogs,
  mediaAssets,
  pointLedger,
  scriptFiles,
  scriptOrders,
  scripts,
  users
} from '@/infrastructure/database/schema';
import { getScriptDetail } from '@/modules/script-catalog/service';
import { AppError } from '@/shared/api/errors';

import type { PurchasedFileKind, ScriptOrderDto, ScriptPurchaseDto } from './contracts';

type OrderRow = {
  order: typeof scriptOrders.$inferSelect;
  scriptTitle: string;
  buyerName: string;
  buyerEmail: string;
};

function orderDto(row: OrderRow): ScriptOrderDto {
  return {
    id: row.order.id,
    orderNo: row.order.orderNo,
    scriptId: row.order.scriptId,
    scriptTitle: row.scriptTitle,
    buyerUserId: row.order.buyerUserId,
    buyer: row.buyerName,
    buyerEmail: row.buyerEmail,
    amount: row.order.pricePoints,
    status: row.order.status,
    createdAt: row.order.createdAt.toISOString(),
    completedAt: row.order.completedAt?.toISOString() ?? null
  };
}

function orderNumber(): string {
  const date = new Date();
  const day = date.toISOString().slice(0, 10).replaceAll('-', '');
  return `XZ${day}${randomBytes(5).toString('hex').toUpperCase()}`;
}

async function getOrderRow(orderId: string): Promise<OrderRow> {
  const [row] = await getDatabase()
    .select({
      order: scriptOrders,
      scriptTitle: scripts.title,
      buyerName: users.name,
      buyerEmail: users.email
    })
    .from(scriptOrders)
    .innerJoin(scripts, eq(scriptOrders.scriptId, scripts.id))
    .innerJoin(users, eq(scriptOrders.buyerUserId, users.id))
    .where(eq(scriptOrders.id, orderId));
  if (!row) throw new AppError('NOT_FOUND', '订单不存在', 404);
  return row;
}

export async function purchaseScript(
  scriptId: string,
  buyerUserId: string
): Promise<ScriptPurchaseDto> {
  const database = getDatabase();
  const result = await database.transaction(async (transaction) => {
    const [script] = await transaction
      .select()
      .from(scripts)
      .where(eq(scripts.id, scriptId))
      .limit(1)
      .for('update');
    if (!script || script.status === 'archived') {
      throw new AppError('NOT_FOUND', '剧本不存在', 404);
    }

    const [existingOrder] = await transaction
      .select()
      .from(scriptOrders)
      .where(
        and(
          eq(scriptOrders.scriptId, scriptId),
          eq(scriptOrders.buyerUserId, buyerUserId),
          eq(scriptOrders.status, 'completed')
        )
      )
      .limit(1);
    if (existingOrder) {
      const [buyer] = await transaction
        .select({ pointsBalance: users.pointsBalance })
        .from(users)
        .where(eq(users.id, buyerUserId));
      return {
        orderId: existingOrder.id,
        balanceAfter: buyer?.pointsBalance ?? 0,
        alreadyOwned: true
      };
    }
    if (script.status !== 'available') {
      throw new AppError('CONFLICT', '该剧本已经售出或暂不可购买', 409);
    }

    const [buyer] = await transaction
      .select()
      .from(users)
      .where(eq(users.id, buyerUserId))
      .limit(1)
      .for('update');
    if (!buyer || buyer.role !== 'member') {
      throw new AppError('FORBIDDEN', '只有白名单用户可以购买剧本', 403);
    }
    if (buyer.pointsBalance < script.pricePoints) {
      throw new AppError('CONFLICT', '心源余额不足，请先充值', 409, {
        balance: buyer.pointsBalance,
        required: script.pricePoints
      });
    }

    const now = new Date();
    const balanceAfter = buyer.pointsBalance - script.pricePoints;
    const [order] = await transaction
      .insert(scriptOrders)
      .values({
        orderNo: orderNumber(),
        scriptId,
        buyerUserId,
        pricePoints: script.pricePoints,
        status: 'completed',
        completedAt: now,
        createdAt: now,
        updatedAt: now
      })
      .returning({ id: scriptOrders.id });
    await transaction
      .update(users)
      .set({ pointsBalance: balanceAfter, updatedAt: now })
      .where(eq(users.id, buyerUserId));
    await transaction.insert(pointLedger).values({
      userId: buyerUserId,
      direction: 'debit',
      amount: script.pricePoints,
      balanceAfter,
      source: 'purchase',
      referenceType: 'script-order',
      referenceId: order.id,
      note: `购买《${script.title}》独家授权`,
      createdByUserId: buyerUserId,
      createdAt: now
    });
    await transaction
      .update(scripts)
      .set({ status: 'sold', updatedAt: now, version: script.version + 1 })
      .where(eq(scripts.id, scriptId));
    await transaction.insert(auditLogs).values({
      actorUserId: buyerUserId,
      action: 'script.purchased',
      entityType: 'script-order',
      entityId: order.id,
      metadata: { scriptId, pricePoints: script.pricePoints, balanceAfter }
    });
    return { orderId: order.id, balanceAfter, alreadyOwned: false };
  });

  const [order, script] = await Promise.all([
    getOrderRow(result.orderId),
    getScriptDetail(scriptId, 'member', buyerUserId)
  ]);
  return {
    order: orderDto(order),
    script,
    balanceAfter: result.balanceAfter,
    alreadyOwned: result.alreadyOwned
  };
}

export async function listUserOrders(userId: string): Promise<ScriptOrderDto[]> {
  const rows = await getDatabase()
    .select({
      order: scriptOrders,
      scriptTitle: scripts.title,
      buyerName: users.name,
      buyerEmail: users.email
    })
    .from(scriptOrders)
    .innerJoin(scripts, eq(scriptOrders.scriptId, scripts.id))
    .innerJoin(users, eq(scriptOrders.buyerUserId, users.id))
    .where(eq(scriptOrders.buyerUserId, userId))
    .orderBy(desc(scriptOrders.createdAt));
  return rows.map(orderDto);
}

export async function listAdminOrders(): Promise<ScriptOrderDto[]> {
  const rows = await getDatabase()
    .select({
      order: scriptOrders,
      scriptTitle: scripts.title,
      buyerName: users.name,
      buyerEmail: users.email
    })
    .from(scriptOrders)
    .innerJoin(scripts, eq(scriptOrders.scriptId, scripts.id))
    .innerJoin(users, eq(scriptOrders.buyerUserId, users.id))
    .orderBy(desc(scriptOrders.createdAt));
  return rows.map(orderDto);
}

export async function getPurchasedFile(
  scriptId: string,
  kind: PurchasedFileKind,
  userId: string,
  role: 'member' | 'admin'
): Promise<{ asset: typeof mediaAssets.$inferSelect; displayName: string }> {
  if (role !== 'admin') {
    const [order] = await getDatabase()
      .select({ id: scriptOrders.id })
      .from(scriptOrders)
      .where(
        and(
          eq(scriptOrders.scriptId, scriptId),
          eq(scriptOrders.buyerUserId, userId),
          eq(scriptOrders.status, 'completed')
        )
      );
    if (!order) throw new AppError('FORBIDDEN', '购买后才能下载完整文件', 403);
  }

  const [file] = await getDatabase()
    .select({ asset: mediaAssets, displayName: scriptFiles.displayName })
    .from(scriptFiles)
    .innerJoin(mediaAssets, eq(scriptFiles.assetId, mediaAssets.id))
    .where(
      and(
        eq(scriptFiles.scriptId, scriptId),
        eq(scriptFiles.kind, kind),
        eq(mediaAssets.visibility, 'private'),
        isNull(mediaAssets.deletedAt)
      )
    );
  if (!file) throw new AppError('NOT_FOUND', '交付文件不存在', 404);
  return file;
}
