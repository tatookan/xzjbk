import sharp from 'sharp';

import { createStorageKey, getStorageProvider } from '@/infrastructure/storage';
import type { AssetVisibility, StoredObject } from '@/infrastructure/storage';
import { AppError } from '@/shared/api/errors';
import { getServerEnv } from '@/shared/config/server-env';

const COVER_MAX_BYTES = 12 * 1024 * 1024;
const ALLOWED_DOCUMENT_EXTENSIONS = new Set(['doc', 'docx', 'txt', 'md']);

export interface PreparedCatalogAsset {
  stored: StoredObject;
  metadata: Record<string, unknown>;
}

export interface PreparedScriptAssets {
  cover: PreparedCatalogAsset;
  english: PreparedCatalogAsset;
  secondary: PreparedCatalogAsset;
  director: PreparedCatalogAsset;
}

export function readFileField(formData: FormData, name: string, required: boolean): File | null {
  const value = formData.get(name);
  if (!(value instanceof File) || value.size === 0) {
    if (required) throw new AppError('VALIDATION_ERROR', `请选择${name}`, 422);
    return null;
  }
  return value;
}

export async function prepareScriptCover(
  scriptId: string,
  file: File
): Promise<PreparedCatalogAsset> {
  if (file.size > Math.min(COVER_MAX_BYTES, getServerEnv().MAX_UPLOAD_BYTES)) {
    throw new AppError('VALIDATION_ERROR', '剧本封面不能超过 12 MB', 422);
  }

  const input = Buffer.from(await file.arrayBuffer());
  let output: Buffer;
  let width: number | null = null;
  let height: number | null = null;
  try {
    output = await sharp(input, { animated: false, limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: 1600, height: 2400, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 90, effort: 4 })
      .toBuffer();
    const metadata = await sharp(output).metadata();
    width = metadata.width ?? null;
    height = metadata.height ?? null;
  } catch {
    throw new AppError('VALIDATION_ERROR', '封面无法识别，请上传 JPG、PNG、WebP 或 AVIF', 422);
  }

  const stored = await getStorageProvider().write({
    key: createStorageKey(`scripts/${scriptId}/cover`, `${file.name}.webp`),
    data: output,
    contentType: 'image/webp',
    originalName: file.name,
    visibility: 'public'
  });
  return { stored, metadata: { width, height, sourceMimeType: file.type } };
}

export async function prepareScriptDocument(
  scriptId: string,
  kind: string,
  file: File
): Promise<PreparedCatalogAsset> {
  if (file.size > getServerEnv().MAX_UPLOAD_BYTES) {
    throw new AppError('VALIDATION_ERROR', '单个剧本文件超过允许大小', 422);
  }
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_DOCUMENT_EXTENSIONS.has(extension)) {
    throw new AppError('VALIDATION_ERROR', '剧本文件仅支持 Word、TXT 或 Markdown', 422);
  }
  const visibility: AssetVisibility = 'private';
  const stored = await getStorageProvider().write({
    key: createStorageKey(`scripts/${scriptId}/${kind}`, file.name),
    data: new Uint8Array(await file.arrayBuffer()),
    contentType: file.type || 'application/octet-stream',
    originalName: file.name,
    visibility
  });
  return { stored, metadata: { extension } };
}

export async function discardPreparedAssets(assets: PreparedCatalogAsset[]): Promise<void> {
  await Promise.all(
    assets.map((asset) =>
      getStorageProvider()
        .delete(asset.stored.key)
        .catch(() => undefined)
    )
  );
}

export async function prepareNewScriptAssets(
  scriptId: string,
  formData: FormData
): Promise<PreparedScriptAssets> {
  const prepared: PreparedCatalogAsset[] = [];
  try {
    const cover = await prepareScriptCover(scriptId, readFileField(formData, 'cover', true)!);
    prepared.push(cover);
    const english = await prepareScriptDocument(
      scriptId,
      'english',
      readFileField(formData, 'english', true)!
    );
    prepared.push(english);
    const secondary = await prepareScriptDocument(
      scriptId,
      'secondary',
      readFileField(formData, 'secondary', true)!
    );
    prepared.push(secondary);
    const director = await prepareScriptDocument(
      scriptId,
      'director',
      readFileField(formData, 'director', true)!
    );
    prepared.push(director);
    return { cover, english, secondary, director };
  } catch (error) {
    await discardPreparedAssets(prepared);
    throw error;
  }
}
