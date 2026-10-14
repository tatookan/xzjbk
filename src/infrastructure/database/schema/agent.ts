import {
  boolean,
  char,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';

import { users } from './identity';
import { scripts } from './scripts';

export const agentApiKeyStatus = pgEnum('agent_api_key_status', ['active', 'revoked']);
export const agentImportStatus = pgEnum('agent_import_status', [
  'processing',
  'committed',
  'failed'
]);

export const agentAccessGrants = pgTable(
  'agent_access_grants',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    enabled: boolean('enabled').notNull().default(true),
    grantedByUserId: text('granted_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [index('agent_access_grants_enabled_idx').on(table.enabled)]
);

export const agentApiKeys = pgTable(
  'agent_api_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerUserId: text('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdByUserId: text('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    keyPrefix: varchar('key_prefix', { length: 24 }).notNull(),
    keyHash: char('key_hash', { length: 64 }).notNull(),
    status: agentApiKeyStatus('status').notNull().default('active'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    lastUsedIp: varchar('last_used_ip', { length: 64 }),
    lastSkillVersion: varchar('last_skill_version', { length: 32 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true })
  },
  (table) => [
    uniqueIndex('agent_api_keys_prefix_unique').on(table.keyPrefix),
    uniqueIndex('agent_api_keys_hash_unique').on(table.keyHash),
    index('agent_api_keys_owner_status_idx').on(table.ownerUserId, table.status),
    index('agent_api_keys_expires_idx').on(table.expiresAt)
  ]
);

export const agentImports = pgTable(
  'agent_imports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerUserId: text('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    apiKeyId: uuid('api_key_id')
      .notNull()
      .references(() => agentApiKeys.id, { onDelete: 'restrict' }),
    idempotencyKey: varchar('idempotency_key', { length: 100 }).notNull(),
    status: agentImportStatus('status').notNull().default('processing'),
    scriptId: uuid('script_id').references(() => scripts.id, { onDelete: 'restrict' }),
    requestMetadata: jsonb('request_metadata')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    errorCode: text('error_code'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    committedAt: timestamp('committed_at', { withTimezone: true })
  },
  (table) => [
    uniqueIndex('agent_imports_owner_idempotency_unique').on(
      table.ownerUserId,
      table.idempotencyKey
    ),
    index('agent_imports_owner_created_idx').on(table.ownerUserId, table.createdAt),
    index('agent_imports_status_created_idx').on(table.status, table.createdAt)
  ]
);

export const agentApiRateLimits = pgTable(
  'agent_api_rate_limits',
  {
    apiKeyId: uuid('api_key_id')
      .notNull()
      .references(() => agentApiKeys.id, { onDelete: 'cascade' }),
    scope: varchar('scope', { length: 64 }).notNull(),
    windowStartedAt: timestamp('window_started_at', { withTimezone: true }).notNull(),
    count: integer('count').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [primaryKey({ columns: [table.apiKeyId, table.scope, table.windowStartedAt] })]
);
