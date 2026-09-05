import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';

import { getDatabase } from '@/infrastructure/database/client';
import { auditLogs, mediaAssets, scripts, showcasePosters } from '@/infrastructure/database/schema';
import { getStorageProvider } from '@/infrastructure/storage';
import { AppError } from '@/shared/api/errors';

import type { ShowcasePosterDto, ShowcasePosterInput } from './contracts';
import type { PreparedPosterImage } from './poster-image';

type PosterRow = {
  poster: typeof showcasePosters.$inferSelect;
  asset: typeof mediaAssets.$inferSelect;
  scriptSlug: string | null;
};

function toDto(row: PosterRow): ShowcasePosterDto {
  const { poster } = row;
  const linkHref =
    poster.linkType === 'external'
      ? poster.externalUrl
      : poster.linkType === 'script' && row.scriptSlug
        ? `/scripts/${row.scriptSlug}`
        : null;

  return {
    id: poster.id,
    title: poster.title,
    subtitle: poster.subtitle,
    imageUrl: `/api/v1/assets/${row.asset.id}`,
    linkType: poster.linkType,
    linkHref,
    linkedScriptId: poster.linkedScriptId,
    externalUrl: poster.externalUrl,
    sortOrder: poster.sortOrder,
    published: poster.published,
    createdAt: poster.createdAt.toISOString(),
    updatedAt: poster.updatedAt.toISOString()
  };
}

function selectPosterRows() {
  return getDatabase()
    .select({ poster: showcasePosters, asset: mediaAssets, scriptSlug: scripts.slug })
    .from(showcasePosters)
    .innerJoin(mediaAssets, eq(showcasePosters.imageAssetId, mediaAssets.id))
    .leftJoin(scripts, eq(showcasePosters.linkedScriptId, scripts.id));
}

export async function listPublishedPosters(): Promise<ShowcasePosterDto[]> {
  const rows = await selectPosterRows()
    .where(
      and(
        eq(showcasePosters.published, true),
        isNull(showcasePosters.deletedAt),
        isNull(mediaAssets.deletedAt)
      )
    )
    .orderBy(asc(showcasePosters.sortOrder), asc(showcasePosters.createdAt));
  return rows.map(toDto);
}

export async function listAdminPosters(): Promise<ShowcasePosterDto[]> {
  const rows = await selectPosterRows()
    .where(and(isNull(showcasePosters.deletedAt), isNull(mediaAssets.deletedAt)))
    .orderBy(asc(showcasePosters.sortOrder), asc(showcasePosters.createdAt));
  return rows.map(toDto);
}

function assetValues(image: PreparedPosterImage, actorUserId: string) {
  return {
    provider: image.stored.provider,
    objectKey: image.stored.key,
    originalName: image.stored.originalName,
    mimeType: image.stored.contentType,
    sizeBytes: image.stored.byteSize,
    checksumSha256: image.stored.checksumSha256,
    visibility: image.stored.visibility,
    metadata: image.metadata,
    createdByUserId: actorUserId
  } as const;
}

function posterValues(input: ShowcasePosterInput) {
  return {
    title: input.title,
    subtitle: input.subtitle ?? null,
    linkType: input.linkType,
    linkedScriptId: input.linkType === 'script' ? (input.linkedScriptId ?? null) : null,
    externalUrl: input.linkType === 'external' ? (input.externalUrl ?? null) : null,
    published: input.published,
    publishedAt: input.published ? new Date() : null,
    updatedAt: new Date()
  } as const;
}

export async function createPoster(
  input: ShowcasePosterInput,
  image: PreparedPosterImage,
  actorUserId: string
): Promise<ShowcasePosterDto> {
  const database = getDatabase();

  try {
    const posterId = await database.transaction(async (transaction) => {
      const [asset] = await transaction
        .insert(mediaAssets)
        .values(assetValues(image, actorUserId))
        .returning({ id: mediaAssets.id });
      const [{ nextOrder }] = await transaction
        .select({ nextOrder: sql<number>`coalesce(max(${showcasePosters.sortOrder}), -1) + 1` })
        .from(showcasePosters)
        .where(isNull(showcasePosters.deletedAt));
      const [poster] = await transaction
        .insert(showcasePosters)
        .values({ ...posterValues(input), imageAssetId: asset.id, sortOrder: nextOrder })
        .returning({ id: showcasePosters.id });
      await transaction.insert(auditLogs).values({
        actorUserId,
        action: 'showcase.poster.created',
        entityType: 'showcase_poster',
        entityId: poster.id,
        metadata: { published: input.published }
      });
      return poster.id;
    });

    return getPoster(posterId);
  } catch (error) {
    await getStorageProvider()
      .delete(image.stored.key)
      .catch(() => undefined);
    throw error;
  }
}

export async function getPoster(id: string): Promise<ShowcasePosterDto> {
  const [row] = await selectPosterRows().where(
    and(
      eq(showcasePosters.id, id),
      isNull(showcasePosters.deletedAt),
      isNull(mediaAssets.deletedAt)
    )
  );
  if (!row) throw new AppError('NOT_FOUND', '海报不存在或已经删除', 404);
  return toDto(row);
}

export async function updatePoster(
  id: string,
  input: ShowcasePosterInput,
  replacementImage: PreparedPosterImage | null,
  actorUserId: string
): Promise<ShowcasePosterDto> {
  const database = getDatabase();
  const [existing] = await database
    .select({ poster: showcasePosters, asset: mediaAssets })
    .from(showcasePosters)
    .innerJoin(mediaAssets, eq(showcasePosters.imageAssetId, mediaAssets.id))
    .where(and(eq(showcasePosters.id, id), isNull(showcasePosters.deletedAt)));
  if (!existing) {
    if (replacementImage) {
      await getStorageProvider()
        .delete(replacementImage.stored.key)
        .catch(() => undefined);
    }
    throw new AppError('NOT_FOUND', '海报不存在或已经删除', 404);
  }

  try {
    await database.transaction(async (transaction) => {
      let imageAssetId = existing.poster.imageAssetId;
      if (replacementImage) {
        const [newAsset] = await transaction
          .insert(mediaAssets)
          .values(assetValues(replacementImage, actorUserId))
          .returning({ id: mediaAssets.id });
        imageAssetId = newAsset.id;
        await transaction
          .update(mediaAssets)
          .set({ deletedAt: new Date() })
          .where(eq(mediaAssets.id, existing.asset.id));
      }

      await transaction
        .update(showcasePosters)
        .set({
          ...posterValues(input),
          publishedAt: input.published ? (existing.poster.publishedAt ?? new Date()) : null,
          imageAssetId
        })
        .where(eq(showcasePosters.id, id));
      await transaction.insert(auditLogs).values({
        actorUserId,
        action: 'showcase.poster.updated',
        entityType: 'showcase_poster',
        entityId: id,
        metadata: { published: input.published, imageReplaced: Boolean(replacementImage) }
      });
    });
  } catch (error) {
    if (replacementImage) {
      await getStorageProvider()
        .delete(replacementImage.stored.key)
        .catch(() => undefined);
    }
    throw error;
  }

  if (replacementImage) {
    await getStorageProvider()
      .delete(existing.asset.objectKey)
      .catch(() => undefined);
  }
  return getPoster(id);
}

export async function reorderPosters(orderedIds: string[], actorUserId: string): Promise<void> {
  if (new Set(orderedIds).size !== orderedIds.length) {
    throw new AppError('VALIDATION_ERROR', '海报排序中存在重复项目', 422);
  }
  if (!orderedIds.length) return;

  const database = getDatabase();
  const existing = await database
    .select({ id: showcasePosters.id })
    .from(showcasePosters)
    .where(and(inArray(showcasePosters.id, orderedIds), isNull(showcasePosters.deletedAt)));
  if (existing.length !== orderedIds.length) {
    throw new AppError('NOT_FOUND', '部分海报不存在，请刷新后重试', 404);
  }

  await database.transaction(async (transaction) => {
    for (const [sortOrder, id] of orderedIds.entries()) {
      await transaction
        .update(showcasePosters)
        .set({ sortOrder, updatedAt: new Date() })
        .where(eq(showcasePosters.id, id));
    }
    await transaction.insert(auditLogs).values({
      actorUserId,
      action: 'showcase.posters.reordered',
      entityType: 'showcase_poster',
      metadata: { orderedIds }
    });
  });
}

export async function deletePoster(id: string, actorUserId: string): Promise<void> {
  const database = getDatabase();
  const [existing] = await database
    .select({ poster: showcasePosters, asset: mediaAssets })
    .from(showcasePosters)
    .innerJoin(mediaAssets, eq(showcasePosters.imageAssetId, mediaAssets.id))
    .where(and(eq(showcasePosters.id, id), isNull(showcasePosters.deletedAt)));
  if (!existing) throw new AppError('NOT_FOUND', '海报不存在或已经删除', 404);

  const deletedAt = new Date();
  await database.transaction(async (transaction) => {
    await transaction
      .update(showcasePosters)
      .set({ deletedAt, published: false, updatedAt: deletedAt })
      .where(eq(showcasePosters.id, id));
    await transaction
      .update(mediaAssets)
      .set({ deletedAt })
      .where(eq(mediaAssets.id, existing.asset.id));
    await transaction.insert(auditLogs).values({
      actorUserId,
      action: 'showcase.poster.deleted',
      entityType: 'showcase_poster',
      entityId: id,
      metadata: { imageAssetId: existing.asset.id }
    });
  });
  await getStorageProvider()
    .delete(existing.asset.objectKey)
    .catch(() => undefined);
}
