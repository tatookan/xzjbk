import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid
} from 'drizzle-orm/pg-core';

import { mediaAssets } from './assets';
import { scripts } from './scripts';

export const showcaseLinkType = pgEnum('showcase_link_type', ['none', 'script', 'external']);

export const showcasePosters = pgTable(
  'showcase_posters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    subtitle: text('subtitle'),
    imageAssetId: uuid('image_asset_id')
      .notNull()
      .references(() => mediaAssets.id, { onDelete: 'restrict' }),
    linkType: showcaseLinkType('link_type').notNull().default('none'),
    linkedScriptId: uuid('linked_script_id').references(() => scripts.id, {
      onDelete: 'set null'
    }),
    externalUrl: text('external_url'),
    sortOrder: integer('sort_order').notNull().default(0),
    published: boolean('published').notNull().default(false),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true })
  },
  (table) => [index('showcase_posters_published_order_idx').on(table.published, table.sortOrder)]
);
