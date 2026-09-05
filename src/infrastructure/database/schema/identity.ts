import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from 'drizzle-orm/pg-core';

export const userRole = pgEnum('user_role', ['member', 'admin']);
export const inviteCodeStatus = pgEnum('invite_code_status', ['unused', 'used', 'revoked']);

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    role: userRole('role').notNull().default('member'),
    pointsBalance: integer('points_balance').notNull().default(0),
    discountBasisPoints: integer('discount_basis_points').notNull().default(10_000),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex('users_email_unique').on(table.email),
    check('users_points_nonnegative', sql`${table.pointsBalance} >= 0`),
    check('users_discount_valid', sql`${table.discountBasisPoints} between 1 and 10000`)
  ]
);

export const inviteCodes = pgTable(
  'invite_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull(),
    status: inviteCodeStatus('status').notNull().default('unused'),
    createdByUserId: text('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    usedByUserId: text('used_by_user_id').references(() => users.id, {
      onDelete: 'restrict'
    }),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex('invite_codes_code_unique').on(table.code),
    uniqueIndex('invite_codes_used_by_unique')
      .on(table.usedByUserId)
      .where(sql`${table.usedByUserId} is not null`)
  ]
);
