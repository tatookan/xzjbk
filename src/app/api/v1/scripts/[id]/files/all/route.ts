import type { Readable } from 'node:stream';

import { zipSync } from 'fflate';
import { NextResponse } from 'next/server';

import { getStorageProvider } from '@/infrastructure/storage';
import { getPurchasedFiles } from '@/modules/commerce/service';
import { requireSession } from '@/modules/identity/session';
import { withApiHandler } from '@/shared/api/handler';
import { assertRateLimit } from '@/shared/security/rate-limit';

interface DownloadAllRouteContext {
  params: Promise<{ id: string }>;
}

async function readAll(stream: Readable): Promise<Uint8Array> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function safeFilename(value: string, fallback: string): string {
  const basename = value
    .split(/[\\/]/)
    .pop()
    ?.split('')
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('')
    .trim();
  return basename || fallback;
}

export async function GET(request: Request, context: DownloadAllRouteContext) {
  try {
    const session = await requireSession(request.headers);
    assertRateLimit({
      scope: 'delivery-archive',
      key: session.user.id,
      max: 10,
      windowMs: 60_000
    });
    const { id } = await context.params;
    const delivery = await getPurchasedFiles(id, session.user.id, session.user.role);
    const archiveInput: Record<string, Uint8Array> = {};

    for (const [index, file] of delivery.files.entries()) {
      const stream = await getStorageProvider().open(file.asset.objectKey);
      const filename = safeFilename(file.displayName, `${file.kind}.bin`);
      archiveInput[`${String(index + 1).padStart(2, '0')}-${filename}`] = await readAll(stream);
    }

    const archive = zipSync(archiveInput, { level: 0 });
    const downloadName = safeFilename(
      `${delivery.scriptTitle}-完整交付.zip`,
      'script-delivery.zip'
    );
    const encodedName = encodeURIComponent(downloadName).replaceAll("'", '%27');

    return new NextResponse(Buffer.from(archive), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Length': String(archive.byteLength),
        'Content-Disposition': `attachment; filename="script-delivery.zip"; filename*=UTF-8''${encodedName}`,
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
