import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from 'drizzle-orm/pg-core';

import { users } from './identity';
import { scripts } from './scripts';

export const ledgerDirection = pgEnum('ledger_direction', ['credit', 'debit']);
export const ledgerSource = pgEnum('ledger_source', [
  'admin-adjustment',
  'recharge',
  'purchase',
  'refund'
]);
export const orderStatus = pgEnum('order_status', [
  'pending',
  'completed',
  'cancelled',
  'refunded'
]);
export const rechargeStatus = pgEnum('recharge_status', ['pending', 'paid', 'closed', 'refunded']);

export const rechargePlans = pgTable(
  'recharge_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    amountCents: integer('amount_cents').notNull(),
    basePoints: integer('base_points').notNull(),
    bonusPoints: integer('bonus_points').notNull().default(0),
    sortOrder: integer('sort_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex('recharge_plans_amount_unique').on(table.amountCents),
    index('recharge_plans_active_sort_idx').on(table.isActive, table.sortOrder),
    check('recharge_plans_amount_positive', sql`${table.amountCents} > 0`),
    check('recharge_plans_base_rate_fixed', sql`${table.basePoints} = ${table.amountCents}`),
    check('recharge_plans_bonus_nonnegative', sql`${table.bonusPoints} >= 0`),
    check(
      'recharge_plans_max_discount',
      sql`(${table.basePoints} + ${table.bonusPoints}) * 2 <= ${table.amountCents} * 5`
    )
  ]
);

export const pointLedger = pgTable(
  'point_ledger',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    direction: ledgerDirection('direction').notNull(),
    amount: integer('amount').notNull(),
    balanceAfter: integer('balance_after').notNull(),
    source: ledgerSource('source').notNull(),
    referenceType: text('reference_type'),
    referenceId: text('reference_id'),
    note: text('note'),
    createdByUserId: text('created_by_user_id').references(() => users.id, {
      onDelete: 'restrict'
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    index('point_ledger_user_created_idx').on(table.userId, table.createdAt),
    check('point_ledger_amount_positive', sql`${table.amount} > 0`),
    check('point_ledger_balance_nonnegative', sql`${table.balanceAfter} >= 0`)
  ]
);

export const scriptOrders = pgTable(
  'script_orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderNo: text('order_no').notNull(),
    scriptId: uuid('script_id')
      .notNull()
      .references(() => scripts.id, { onDelete: 'restrict' }),
    buyerUserId: text('buyer_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    pricePoints: integer('price_points').notNull(),
    status: orderStatus('status').notNull().default('pending'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex('script_orders_order_no_unique').on(table.orderNo),
    uniqueIndex('script_orders_completed_script_unique')
      .on(table.scriptId)
      .where(sql`${table.status} = 'completed'`),
    index('script_orders_buyer_created_idx').on(table.buyerUserId, table.createdAt),
    check('script_orders_price_positive', sql`${table.pricePoints} > 0`)
  ]
);

export const rechargeOrders = pgTable(
  'recharge_orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    rechargeNo: text('recharge_no').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    rechargePlanId: uuid('recharge_plan_id')
      .notNull()
      .references(() => rechargePlans.id, { onDelete: 'restrict' }),
    amountCents: integer('amount_cents').notNull(),
    basePoints: integer('base_points').notNull(),
    bonusPoints: integer('bonus_points').notNull(),
    points: integer('points').notNull(),
    provider: text('provider').notNull().default('alipay'),
    externalTradeNo: text('external_trade_no'),
    status: rechargeStatus('status').notNull().default('pending'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex('recharge_orders_number_unique').on(table.rechargeNo),
    uniqueIndex('recharge_orders_external_trade_unique')
      .on(table.externalTradeNo)
      .where(sql`${table.externalTradeNo} is not null`),
    index('recharge_orders_user_created_idx').on(table.userId, table.createdAt),
    check('recharge_orders_amount_positive', sql`${table.amountCents} > 0`),
    check('recharge_orders_points_positive', sql`${table.points} > 0`),
    check('recharge_orders_base_rate_fixed', sql`${table.basePoints} = ${table.amountCents}`),
    check('recharge_orders_bonus_nonnegative', sql`${table.bonusPoints} >= 0`),
    check(
      'recharge_orders_points_match',
      sql`${table.points} = ${table.basePoints} + ${table.bonusPoints}`
    ),
    check('recharge_orders_max_discount', sql`${table.points} * 2 <= ${table.amountCents} * 5`)
  ]
);

export const paymentEvents = pgTable(
  'payment_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    provider: text('provider').notNull(),
    externalEventId: text('external_event_id').notNull(),
    eventType: text('event_type').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    signatureVerified: boolean('signature_verified').notNull().default(false),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex('payment_events_provider_event_unique').on(table.provider, table.externalEventId)
  ]
);
