import {
  bigint,
  char,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';

import { users } from './identity';

export const storageProvider = pgEnum('storage_provider', ['local', 'oss']);
export const assetVisibility = pgEnum('asset_visibility', ['public', 'private']);

export const mediaAssets = pgTable(
  'media_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    provider: storageProvider('provider').notNull(),
    objectKey: text('object_key').notNull(),
    originalName: text('original_name').notNull(),
    mimeType: varchar('mime_type', { length: 255 }).notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    checksumSha256: char('checksum_sha256', { length: 64 }).notNull(),
    visibility: assetVisibility('visibility').notNull().default('private'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdByUserId: text('created_by_user_id').references(() => users.id, {
      onDelete: 'set null'
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true })
  },
  (table) => [
    uniqueIndex('media_assets_provider_key_unique').on(table.provider, table.objectKey),
    index('media_assets_checksum_idx').on(table.checksumSha256),
    index('media_assets_created_at_idx').on(table.createdAt)
  ]
);
