import sharp, { type Metadata, type Sharp } from 'sharp';

import { createStorageKey, getStorageProvider } from '@/infrastructure/storage';
import type { StoredObject } from '@/infrastructure/storage';
import { getServerEnv } from '@/shared/config/server-env';
import { AppError } from '@/shared/api/errors';

const POSTER_MAX_BYTES = 1 * 1024 * 1024;
const POSTER_MAX_PIXELS = 40_000_000;

export interface PreparedPosterImage {
  stored: StoredObject;
  metadata: {
    width: number | null;
    height: number | null;
    sourceMimeType: string;
  };
}

export function readPosterFile(formData: FormData, required: boolean): File | null {
  const value = formData.get('image');
  if (!(value instanceof File) || value.size === 0) {
    if (required) throw new AppError('VALIDATION_ERROR', '请选择一张海报图片', 422);
    return null;
  }
  return value;
}

export async function preparePosterImage(file: File): Promise<PreparedPosterImage> {
  const uploadLimit = Math.min(getServerEnv().MAX_UPLOAD_BYTES, POSTER_MAX_BYTES);
  if (file.size > uploadLimit) {
    throw new AppError('VALIDATION_ERROR', '海报图片不能超过 1 MB，请压缩后再上传', 422);
  }

  const input = Buffer.from(await file.arrayBuffer());
  let image: Sharp;
  let sourceMetadata: Metadata;

  try {
    image = sharp(input, { animated: false, limitInputPixels: POSTER_MAX_PIXELS });
    sourceMetadata = await image.metadata();
  } catch {
    throw new AppError('VALIDATION_ERROR', '图片无法识别，请上传 JPG、PNG、WebP 或 AVIF', 422);
  }

  if (!sourceMetadata.width || !sourceMetadata.height) {
    throw new AppError('VALIDATION_ERROR', '图片尺寸无效', 422);
  }

  let output: Buffer;
  let outputMetadata: Metadata;
  try {
    output = await image
      .rotate()
      .resize({ width: 1600, height: 2400, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 88, effort: 4 })
      .toBuffer();
    outputMetadata = await sharp(output).metadata();
  } catch {
    throw new AppError('VALIDATION_ERROR', '图片处理失败，请更换图片后重试', 422);
  }

  const storage = getStorageProvider();
  const key = createStorageKey('showcase/posters', `${file.name}.webp`);
  const stored = await storage.write({
    key,
    data: output,
    contentType: 'image/webp',
    originalName: file.name,
    visibility: 'public'
  });

  return {
    stored,
    metadata: {
      width: outputMetadata.width ?? null,
      height: outputMetadata.height ?? null,
      sourceMimeType: file.type || 'application/octet-stream'
    }
  };
}
