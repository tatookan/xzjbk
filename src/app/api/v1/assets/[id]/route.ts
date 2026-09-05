import { Readable } from 'node:stream';

import { and, eq, isNull } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { getDatabase } from '@/infrastructure/database/client';
import { mediaAssets } from '@/infrastructure/database/schema';
import { getStorageProvider } from '@/infrastructure/storage';
import { AppError } from '@/shared/api/errors';
import { withApiHandler } from '@/shared/api/handler';

interface AssetRouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: AssetRouteContext) {
  const { id } = await context.params;
  const [asset] = await getDatabase()
    .select()
    .from(mediaAssets)
    .where(
      and(
        eq(mediaAssets.id, id),
        eq(mediaAssets.visibility, 'public'),
        isNull(mediaAssets.deletedAt)
      )
    );

  if (!asset) {
    return withApiHandler(request, async () => {
      throw new AppError('NOT_FOUND', '图片不存在', 404);
    });
  }

  const etag = `"${asset.checksumSha256}"`;
  if (request.headers.get('if-none-match') === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  }

  const stream = await getStorageProvider().open(asset.objectKey);
  return new NextResponse(Readable.toWeb(stream) as ReadableStream<Uint8Array>, {
    headers: {
      'Content-Type': asset.mimeType,
      'Content-Length': String(asset.sizeBytes),
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'X-Content-Type-Options': 'nosniff',
      ETag: etag
    }
  });
}
