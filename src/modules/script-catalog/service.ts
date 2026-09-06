import { randomUUID } from 'node:crypto';

import { and, asc, desc, eq, inArray, isNull, ne } from 'drizzle-orm';

import { getDatabase } from '@/infrastructure/database/client';
import {
  auditLogs,
  mediaAssets,
  scriptFiles,
  scriptOrders,
  scriptPreviews,
  scripts
} from '@/infrastructure/database/schema';
import { getStorageProvider } from '@/infrastructure/storage';
import { AppError } from '@/shared/api/errors';

import type { PreparedCatalogAsset, PreparedScriptAssets } from './assets';
import { discardPreparedAssets } from './assets';
import type { CatalogScriptDto, CatalogScriptInput } from './contracts';

type ScriptRow = {
  script: typeof scripts.$inferSelect;
  cover: typeof mediaAssets.$inferSelect;
};

function presentationLabel(value: 'narration' | 'performance'): '解说' | '演绎' {
  return value === 'narration' ? '解说' : '演绎';
}

function presentationValue(value: '解说' | '演绎'): 'narration' | 'performance' {
  return value === '解说' ? 'narration' : 'performance';
}

function packageFormat(value: 'bilingual-package' | 'parallel-production'): string {
  return value === 'parallel-production'
    ? 'Word / TXT / MD · 中文制作版 + English Production'
    : 'Word / TXT / MD · 英文 + 中英对照';
}

function emptyDeliverables(packageMode: 'bilingual-package' | 'parallel-production') {
  return packageMode === 'parallel-production'
    ? { script: '英文制作稿', chinese: '中文制作稿', directorStatement: '导演阐述' }
    : { script: '英文剧本', bilingual: '中英对照剧本', directorStatement: '导演阐述' };
}

function baseDto(row: ScriptRow): CatalogScriptDto {
  const status = row.script.status === 'archived' ? 'draft' : row.script.status;
  return {
    id: row.script.id,
    version: row.script.version,
    title: row.script.title,
    englishTitle: row.script.englishTitle ?? '',
    genre: row.script.genre,
    image: `/api/v1/assets/${row.cover.id}`,
    logline: row.script.logline,
    synopsis: '',
    directorStatement: '',
    directorSections: [],
    preview: [],
    sourceUnitCount: row.script.sourceUnitCount ?? undefined,
    previewUnitCount: 0,
    previewUnitLabel: row.script.previewUnitLabel === '场' ? '场' : '段',
    previewVisibleCount: 0,
    previewRationale: '',
    packageMode: row.script.packageMode,
    presentationMode: presentationLabel(row.script.presentationMode),
    price: row.script.pricePoints,
    status,
    episodes: row.script.episodes,
    format: packageFormat(row.script.packageMode),
    tags: row.script.tags,
    deliverables: emptyDeliverables(row.script.packageMode),
    detailLoaded: false
  };
}

function selectScriptRows() {
  return getDatabase()
    .select({ script: scripts, cover: mediaAssets })
    .from(scripts)
    .innerJoin(mediaAssets, eq(scripts.coverAssetId, mediaAssets.id));
}

async function hydrateDetail(row: ScriptRow, showOriginalFileNames: boolean) {
  const database = getDatabase();
  const previewQuery = database
    .select({ sequence: scriptPreviews.sequence, zh: scriptPreviews.zh, en: scriptPreviews.en })
    .from(scriptPreviews)
    .where(eq(scriptPreviews.scriptId, row.script.id))
    .orderBy(asc(scriptPreviews.sequence));
  const previews = showOriginalFileNames
    ? await previewQuery
    : await previewQuery.limit(row.script.previewVisibleCount);
  const files = await database
    .select({ kind: scriptFiles.kind, displayName: scriptFiles.displayName })
    .from(scriptFiles)
    .where(eq(scriptFiles.scriptId, row.script.id));
  const dto = baseDto(row);
  const names = Object.fromEntries(files.map((file) => [file.kind, file.displayName]));
  const fallback = emptyDeliverables(row.script.packageMode);
  dto.synopsis = row.script.synopsis;
  dto.directorStatement = row.script.directorStatement;
  dto.directorSections = row.script.directorSections.map((section, index) => ({
    id: `director-${index + 1}`,
    title: section.title,
    summary: section.content
  }));
  dto.preview = previews.map(({ zh, en }) => ({ zh, en }));
  dto.previewUnitCount = row.script.previewVisibleCount;
  dto.previewVisibleCount = row.script.previewVisibleCount;
  dto.previewRationale = row.script.previewRationale ?? '';
  dto.deliverables =
    row.script.packageMode === 'parallel-production'
      ? {
          script: showOriginalFileNames ? (names.script ?? fallback.script) : fallback.script,
          chinese: showOriginalFileNames ? (names.chinese ?? fallback.chinese) : fallback.chinese,
          directorStatement: showOriginalFileNames
            ? (names['director-statement'] ?? fallback.directorStatement)
            : fallback.directorStatement
        }
      : {
          script: showOriginalFileNames ? (names.script ?? fallback.script) : fallback.script,
          bilingual: showOriginalFileNames
            ? (names.bilingual ?? fallback.bilingual)
            : fallback.bilingual,
          directorStatement: showOriginalFileNames
            ? (names['director-statement'] ?? fallback.directorStatement)
            : fallback.directorStatement
        };
  dto.detailLoaded = true;
  return dto;
}

export async function listPublicScripts(): Promise<CatalogScriptDto[]> {
  const rows = await selectScriptRows()
    .where(and(inArray(scripts.status, ['available', 'sold']), isNull(mediaAssets.deletedAt)))
    .orderBy(desc(scripts.publishedAt), desc(scripts.createdAt));
  return rows.map(baseDto);
}

export async function listAdminScripts(): Promise<CatalogScriptDto[]> {
  const rows = await selectScriptRows()
    .where(and(ne(scripts.status, 'archived'), isNull(mediaAssets.deletedAt)))
    .orderBy(desc(scripts.createdAt));
  return Promise.all(rows.map((row) => hydrateDetail(row, true)));
}

export async function getScriptDetail(
  id: string,
  role: 'member' | 'admin',
  userId?: string
): Promise<CatalogScriptDto> {
  const [row] = await selectScriptRows().where(
    and(eq(scripts.id, id), ne(scripts.status, 'archived'), isNull(mediaAssets.deletedAt))
  );
  if (!row) throw new AppError('NOT_FOUND', '剧本不存在', 404);
  let ownsScript = false;
  if (role !== 'admin' && row.script.status !== 'available') {
    if (row.script.status === 'sold' && userId) {
      const [order] = await getDatabase()
        .select({ id: scriptOrders.id })
        .from(scriptOrders)
        .where(
          and(
            eq(scriptOrders.scriptId, id),
            eq(scriptOrders.buyerUserId, userId),
            eq(scriptOrders.status, 'completed')
          )
        );
      ownsScript = Boolean(order);
    }
    if (!ownsScript) throw new AppError('NOT_FOUND', '该剧本已经售出或暂不可查看', 404);
  }
  return hydrateDetail(row, role === 'admin' || ownsScript);
}

function assetRecord(asset: PreparedCatalogAsset, actorUserId: string) {
  return {
    provider: asset.stored.provider,
    objectKey: asset.stored.key,
    originalName: asset.stored.originalName,
    mimeType: asset.stored.contentType,
    sizeBytes: asset.stored.byteSize,
    checksumSha256: asset.stored.checksumSha256,
    visibility: asset.stored.visibility,
    metadata: asset.metadata,
    createdByUserId: actorUserId
  } as const;
}

function scriptRecord(input: CatalogScriptInput) {
  return {
    title: input.title,
    englishTitle: input.englishTitle,
    genre: input.genre,
    logline: input.logline,
    synopsis: input.synopsis,
    directorStatement: input.directorStatement,
    previewRationale: input.previewRationale || null,
    sourceUnitCount: input.sourceUnitCount,
    previewUnitLabel: input.previewUnitLabel,
    previewVisibleCount: input.previewVisibleCount,
    presentationMode: presentationValue(input.presentationMode),
    packageMode: input.packageMode,
    pricePoints: input.price,
    episodes: input.episodes,
    status: input.status,
    tags: input.tags,
    publishedAt: input.status === 'available' ? new Date() : null,
    updatedAt: new Date()
  } as const;
}

export async function createScript(
  id: string,
  input: CatalogScriptInput,
  assets: PreparedScriptAssets,
  actorUserId: string
): Promise<CatalogScriptDto> {
  const prepared = [assets.cover, assets.english, assets.secondary, assets.director];
  const database = getDatabase();
  try {
    await database.transaction(async (transaction) => {
      const insertedAssets = await transaction
        .insert(mediaAssets)
        .values(prepared.map((asset) => assetRecord(asset, actorUserId)))
        .returning({ id: mediaAssets.id });
      const [cover, english, secondary, director] = insertedAssets;
      await transaction.insert(scripts).values({
        id,
        slug: `script-${id}`,
        ...scriptRecord(input),
        coverAssetId: cover.id,
        createdByUserId: actorUserId
      });
      await transaction.insert(scriptFiles).values([
        {
          scriptId: id,
          kind: 'script',
          assetId: english.id,
          displayName: assets.english.stored.originalName,
          sortOrder: 0
        },
        {
          scriptId: id,
          kind: input.packageMode === 'parallel-production' ? 'chinese' : 'bilingual',
          assetId: secondary.id,
          displayName: assets.secondary.stored.originalName,
          sortOrder: 1
        },
        {
          scriptId: id,
          kind: 'director-statement',
          assetId: director.id,
          displayName: assets.director.stored.originalName,
          sortOrder: 2
        }
      ]);
      await transaction
        .insert(scriptPreviews)
        .values(input.preview.map((line, sequence) => ({ scriptId: id, sequence, ...line })));
      await transaction.insert(auditLogs).values({
        actorUserId,
        action: 'script.created',
        entityType: 'script',
        entityId: id,
        metadata: { status: input.status, packageMode: input.packageMode }
      });
    });
  } catch (error) {
    await discardPreparedAssets(prepared);
    throw error;
  }
  return getScriptDetail(id, 'admin');
}

export async function updateScript(
  id: string,
  input: CatalogScriptInput,
  replacementCover: PreparedCatalogAsset | null,
  actorUserId: string,
  expectedVersion: number
): Promise<CatalogScriptDto> {
  const database = getDatabase();
  let oldCoverKey: string | undefined;
  try {
    await database.transaction(async (transaction) => {
      const [script] = await transaction
        .select()
        .from(scripts)
        .where(eq(scripts.id, id))
        .for('update');
      if (!script || script.status === 'archived' || !script.coverAssetId) {
        throw new AppError('NOT_FOUND', '剧本不存在', 404);
      }
      if (script.status === 'sold') {
        throw new AppError('CONFLICT', '已售出剧本已经锁定，不能修改', 409);
      }
      if (script.version !== expectedVersion) {
        throw new AppError('CONFLICT', '剧本已被更新，请刷新后重新编辑', 409);
      }
      const [cover] = await transaction
        .select()
        .from(mediaAssets)
        .where(and(eq(mediaAssets.id, script.coverAssetId), isNull(mediaAssets.deletedAt)));
      if (!cover) throw new AppError('NOT_FOUND', '剧本封面不存在', 404);
      const existing = { script, cover };
      oldCoverKey = cover.objectKey;
      let coverAssetId = existing.cover.id;
      if (replacementCover) {
        const [newCover] = await transaction
          .insert(mediaAssets)
          .values(assetRecord(replacementCover, actorUserId))
          .returning({ id: mediaAssets.id });
        coverAssetId = newCover.id;
        await transaction
          .update(mediaAssets)
          .set({ deletedAt: new Date() })
          .where(eq(mediaAssets.id, existing.cover.id));
      }
      await transaction
        .update(scripts)
        .set({
          ...scriptRecord(input),
          packageMode: existing.script.packageMode,
          coverAssetId,
          publishedAt:
            input.status === 'available' ? (existing.script.publishedAt ?? new Date()) : null,
          version: existing.script.version + 1
        })
        .where(eq(scripts.id, id));
      await transaction.delete(scriptPreviews).where(eq(scriptPreviews.scriptId, id));
      await transaction
        .insert(scriptPreviews)
        .values(input.preview.map((line, sequence) => ({ scriptId: id, sequence, ...line })));
      await transaction.insert(auditLogs).values({
        actorUserId,
        action: 'script.updated',
        entityType: 'script',
        entityId: id,
        metadata: { status: input.status, coverReplaced: Boolean(replacementCover) }
      });
    });
  } catch (error) {
    if (replacementCover) await discardPreparedAssets([replacementCover]);
    throw error;
  }
  if (replacementCover && oldCoverKey) {
    await getStorageProvider()
      .delete(oldCoverKey)
      .catch(() => undefined);
  }
  return getScriptDetail(id, 'admin');
}

export async function deleteScript(
  id: string,
  actorUserId: string,
  expectedVersion: number
): Promise<void> {
  const database = getDatabase();
  const assets = await database.transaction(async (transaction) => {
    const [existing] = await transaction
      .select()
      .from(scripts)
      .where(eq(scripts.id, id))
      .for('update');
    if (!existing || existing.status === 'archived') {
      throw new AppError('NOT_FOUND', '剧本不存在', 404);
    }
    if (existing.status === 'sold') {
      throw new AppError('CONFLICT', '已售出剧本关联交易记录，只能保留归档', 409);
    }
    if (existing.version !== expectedVersion) {
      throw new AppError('CONFLICT', '剧本已被更新，请刷新后重试', 409);
    }

    const fileAssets = await transaction
      .select({ asset: mediaAssets })
      .from(scriptFiles)
      .innerJoin(mediaAssets, eq(scriptFiles.assetId, mediaAssets.id))
      .where(eq(scriptFiles.scriptId, id));
    const coverAssets = existing.coverAssetId
      ? await transaction
          .select()
          .from(mediaAssets)
          .where(eq(mediaAssets.id, existing.coverAssetId))
      : [];
    const assets = [...coverAssets, ...fileAssets.map((item) => item.asset)];
    const assetIds = assets.map((asset) => asset.id);

    await transaction.delete(scripts).where(eq(scripts.id, id));
    if (assetIds.length) {
      await transaction
        .update(mediaAssets)
        .set({ deletedAt: new Date() })
        .where(inArray(mediaAssets.id, assetIds));
    }
    await transaction.insert(auditLogs).values({
      actorUserId,
      action: 'script.deleted',
      entityType: 'script',
      entityId: id,
      metadata: { assetCount: assets.length }
    });
    return assets;
  });
  await Promise.all(
    assets.map((asset) =>
      getStorageProvider()
        .delete(asset.objectKey)
        .catch(() => undefined)
    )
  );
}

export function createScriptId(): string {
  return randomUUID();
}
