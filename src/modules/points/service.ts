import { asc, desc, eq } from 'drizzle-orm';

import { getDatabase } from '@/infrastructure/database/client';
import { auditLogs, pointLedger, rechargePlans, users } from '@/infrastructure/database/schema';
import { AppError } from '@/shared/api/errors';

import type { AccountPointsDto, PointLedgerDto, PointsUserDto, RechargePlanDto } from './contracts';

function userDto(user: typeof users.$inferSelect): PointsUserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    points: user.pointsBalance,
    role: user.role,
    createdAt: user.createdAt.toISOString()
  };
}

function ledgerDto(entry: typeof pointLedger.$inferSelect): PointLedgerDto {
  return {
    id: entry.id,
    direction: entry.direction,
    amount: entry.amount,
    balanceAfter: entry.balanceAfter,
    source: entry.source,
    note: entry.note ?? '',
    createdAt: entry.createdAt.toISOString()
  };
}

function planDto(plan: typeof rechargePlans.$inferSelect): RechargePlanDto {
  const totalPoints = plan.basePoints + plan.bonusPoints;
  return {
    id: plan.id,
    name: plan.name,
    amountCents: plan.amountCents,
    amountYuan: plan.amountCents / 100,
    basePoints: plan.basePoints,
    bonusPoints: plan.bonusPoints,
    totalPoints,
    effectiveDiscount: Math.round((plan.amountCents * 10) / totalPoints),
    isActive: plan.isActive
  };
}

export async function listRechargePlans(): Promise<RechargePlanDto[]> {
  const rows = await getDatabase()
    .select()
    .from(rechargePlans)
    .where(eq(rechargePlans.isActive, true))
    .orderBy(asc(rechargePlans.sortOrder), asc(rechargePlans.amountCents));
  return rows.map(planDto);
}

export async function getAccountPoints(userId: string): Promise<AccountPointsDto> {
  const database = getDatabase();
  const [user] = await database.select().from(users).where(eq(users.id, userId));
  if (!user) throw new AppError('NOT_FOUND', '用户不存在', 404);
  const entries = await database
    .select()
    .from(pointLedger)
    .where(eq(pointLedger.userId, userId))
    .orderBy(desc(pointLedger.createdAt))
    .limit(30);
  return { user: userDto(user), ledger: entries.map(ledgerDto) };
}

export async function listPointsUsers(): Promise<PointsUserDto[]> {
  const rows = await getDatabase().select().from(users).orderBy(desc(users.createdAt));
  return rows.map(userDto);
}

export async function adjustUserPoints(
  userId: string,
  delta: number,
  note: string,
  actorUserId: string
): Promise<{ user: PointsUserDto; entry: PointLedgerDto }> {
  const database = getDatabase();
  return database.transaction(async (transaction) => {
    const [user] = await transaction
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .for('update');
    if (!user) throw new AppError('NOT_FOUND', '用户不存在', 404);
    if (user.role !== 'member') {
      throw new AppError('CONFLICT', '管理员账号不参与心源账户调整', 409);
    }

    const balanceAfter = user.pointsBalance + delta;
    if (balanceAfter < 0) {
      throw new AppError('CONFLICT', '扣减后余额不能小于 0', 409);
    }

    const now = new Date();
    const [updatedUser] = await transaction
      .update(users)
      .set({ pointsBalance: balanceAfter, updatedAt: now })
      .where(eq(users.id, userId))
      .returning();
    const [entry] = await transaction
      .insert(pointLedger)
      .values({
        userId,
        direction: delta > 0 ? 'credit' : 'debit',
        amount: Math.abs(delta),
        balanceAfter,
        source: 'admin-adjustment',
        note,
        createdByUserId: actorUserId,
        createdAt: now
      })
      .returning();
    await transaction.insert(auditLogs).values({
      actorUserId,
      action: 'points.adjusted',
      entityType: 'user',
      entityId: userId,
      metadata: { delta, balanceBefore: user.pointsBalance, balanceAfter, note }
    });

    return { user: userDto(updatedUser), entry: ledgerDto(entry) };
  });
}
