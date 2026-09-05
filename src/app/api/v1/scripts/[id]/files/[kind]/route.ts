import { Readable } from 'node:stream';

import { NextResponse } from 'next/server';

import { getStorageProvider } from '@/infrastructure/storage';
import type { PurchasedFileKind } from '@/modules/commerce/contracts';
import { getPurchasedFile } from '@/modules/commerce/service';
import { requireSession } from '@/modules/identity/session';
import { AppError } from '@/shared/api/errors';
import { withApiHandler } from '@/shared/api/handler';

interface DownloadRouteContext {
  params: Promise<{ id: string; kind: string }>;
}

const allowedKinds = new Set<PurchasedFileKind>([
  'script',
  'bilingual',
  'chinese',
  'director-statement'
]);

export async function GET(request: Request, context: DownloadRouteContext) {
  try {
    const session = await requireSession(request.headers);
    const { id, kind } = await context.params;
    if (!allowedKinds.has(kind as PurchasedFileKind)) {
      throw new AppError('NOT_FOUND', '交付文件不存在', 404);
    }
    const { asset, displayName } = await getPurchasedFile(
      id,
      kind as PurchasedFileKind,
      session.user.id,
      session.user.role
    );
    const stream = await getStorageProvider().open(asset.objectKey);
    const encodedName = encodeURIComponent(displayName).replaceAll("'", '%27');
    return new NextResponse(Readable.toWeb(stream) as ReadableStream<Uint8Array>, {
      headers: {
        'Content-Type': asset.mimeType,
        'Content-Length': String(asset.sizeBytes),
        'Content-Disposition': `attachment; filename="download"; filename*=UTF-8''${encodedName}`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (error) {
    return withApiHandler(request, async () => {
      throw error;
    });
  }
}
