import { sql } from 'drizzle-orm';
import {
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

import { mediaAssets } from './assets';
import { users } from './identity';

export const scriptStatus = pgEnum('script_status', ['draft', 'available', 'sold', 'archived']);
export const presentationMode = pgEnum('presentation_mode', ['narration', 'performance']);
export const packageMode = pgEnum('package_mode', ['bilingual-package', 'parallel-production']);
export const scriptFileKind = pgEnum('script_file_kind', [
  'script',
  'bilingual',
  'chinese',
  'director-statement'
]);

export interface DirectorSection {
  title: string;
  content: string;
}

export const scripts = pgTable(
  'scripts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    englishTitle: text('english_title'),
    genre: text('genre').notNull(),
    logline: text('logline').notNull(),
    synopsis: text('synopsis').notNull(),
    directorStatement: text('director_statement').notNull(),
    directorSections: jsonb('director_sections').$type<DirectorSection[]>().notNull().default([]),
    previewRationale: text('preview_rationale'),
    sourceUnitCount: integer('source_unit_count'),
    previewUnitLabel: text('preview_unit_label').notNull().default('场'),
    previewVisibleCount: integer('preview_visible_count').notNull().default(1),
    presentationMode: presentationMode('presentation_mode').notNull(),
    packageMode: packageMode('package_mode').notNull(),
    pricePoints: integer('price_points').notNull(),
    episodes: integer('episodes').notNull(),
    status: scriptStatus('status').notNull().default('draft'),
    tags: text('tags')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    coverAssetId: uuid('cover_asset_id').references(() => mediaAssets.id, {
      onDelete: 'set null'
    }),
    soldToUserId: text('sold_to_user_id').references(() => users.id, {
      onDelete: 'restrict'
    }),
    soldAt: timestamp('sold_at', { withTimezone: true }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdByUserId: text('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex('scripts_slug_unique').on(table.slug),
    index('scripts_status_published_idx').on(table.status, table.publishedAt),
    check('scripts_price_nonnegative', sql`${table.pricePoints} >= 0`),
    check('scripts_episodes_positive', sql`${table.episodes} > 0`),
    check('scripts_preview_visible_positive', sql`${table.previewVisibleCount} > 0`),
    check('scripts_version_positive', sql`${table.version} > 0`)
  ]
);

export const scriptFiles = pgTable(
  'script_files',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scriptId: uuid('script_id')
      .notNull()
      .references(() => scripts.id, { onDelete: 'cascade' }),
    kind: scriptFileKind('kind').notNull(),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => mediaAssets.id, { onDelete: 'restrict' }),
    displayName: text('display_name').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex('script_files_script_kind_unique').on(table.scriptId, table.kind),
    index('script_files_asset_idx').on(table.assetId)
  ]
);

export const scriptPreviews = pgTable(
  'script_previews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scriptId: uuid('script_id')
      .notNull()
      .references(() => scripts.id, { onDelete: 'cascade' }),
    sequence: integer('sequence').notNull(),
    en: text('en').notNull(),
    zh: text('zh').notNull(),
    formatVersion: integer('format_version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => [
    uniqueIndex('script_previews_script_sequence_unique').on(table.scriptId, table.sequence),
    check('script_previews_sequence_nonnegative', sql`${table.sequence} >= 0`)
  ]
);
