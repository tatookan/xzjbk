export const IMAGE_UPLOAD_ACCEPT = 'image/jpeg,image/png,image/webp,image/avif';

const acceptedImageExtensions = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif']);
const MAX_BROWSER_SOURCE_BYTES = 60 * 1024 * 1024;
const MAX_BROWSER_SOURCE_PIXELS = 50_000_000;

type ImageUploadOptions = {
  assetLabel: string;
  maxBytes: number;
  maxSizeLabel: string;
};

export type PreparedBrowserImage = {
  file: File;
  compressed: boolean;
  originalBytes: number;
  outputBytes: number;
};

function getImageTypeError(file: File, assetLabel: string) {
  if (!file.size) return `${assetLabel}内容为空，请重新选择`;
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!acceptedImageExtensions.has(extension)) {
    return `${assetLabel}仅支持 JPG、PNG、WebP 或 AVIF`;
  }
  return null;
}

export function getImageUploadError(file: File, options: ImageUploadOptions) {
  const typeError = getImageTypeError(file, options.assetLabel);
  if (typeError) return typeError;
  if (file.size > options.maxBytes) {
    return `${options.assetLabel}不能超过 ${options.maxSizeLabel}`;
  }
  return null;
}

export function formatUploadBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function canvasToWebp(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob || blob.type !== 'image/webp') {
          reject(new Error('当前浏览器不支持 WebP 图片压缩'));
          return;
        }
        resolve(blob);
      },
      'image/webp',
      quality
    );
  });
}

function webpFileName(name: string) {
  const stem = name.replace(/\.[^.]+$/, '') || 'image';
  return `${stem}.webp`;
}

/**
 * Compresses oversized images locally. Nothing leaves the browser until this resolves.
 * The encoder first searches for the highest acceptable WebP quality, then reduces
 * dimensions only when quality alone cannot reach the requested byte limit.
 */
export async function prepareImageForUpload(
  file: File,
  options: ImageUploadOptions & { maxWidth?: number; maxHeight?: number }
): Promise<PreparedBrowserImage> {
  const typeError = getImageTypeError(file, options.assetLabel);
  if (typeError) throw new Error(typeError);

  if (file.size <= options.maxBytes) {
    return {
      file,
      compressed: false,
      originalBytes: file.size,
      outputBytes: file.size
    };
  }

  if (file.size > MAX_BROWSER_SOURCE_BYTES) {
    throw new Error(`${options.assetLabel}原图不能超过 60 MB`);
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = 'async';
  image.src = objectUrl;

  try {
    await image.decode();
    const sourceWidth = image.naturalWidth;
    const sourceHeight = image.naturalHeight;
    if (!sourceWidth || !sourceHeight) throw new Error(`${options.assetLabel}尺寸无效`);
    if (sourceWidth * sourceHeight > MAX_BROWSER_SOURCE_PIXELS) {
      throw new Error(`${options.assetLabel}像素过高，请先缩小到 5000 万像素以内`);
    }

    const maxWidth = options.maxWidth ?? 1600;
    const maxHeight = options.maxHeight ?? 2400;
    let scale = Math.min(1, maxWidth / sourceWidth, maxHeight / sourceHeight);
    let width = Math.max(1, Math.round(sourceWidth * scale));
    let height = Math.max(1, Math.round(sourceHeight * scale));
    const safeTargetBytes = Math.floor(options.maxBytes * 0.97);

    for (let resizeAttempt = 0; resizeAttempt < 6; resizeAttempt += 1) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { alpha: true });
      if (!context) throw new Error('当前浏览器无法处理图片');
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, 0, 0, width, height);

      const highestQuality = await canvasToWebp(canvas, 0.94);
      if (highestQuality.size <= safeTargetBytes) {
        const output = new File([highestQuality], webpFileName(file.name), {
          type: 'image/webp',
          lastModified: Date.now()
        });
        return {
          file: output,
          compressed: true,
          originalBytes: file.size,
          outputBytes: output.size
        };
      }

      let lowQuality = 0.56;
      let highQuality = 0.94;
      let best: Blob | null = null;
      let smallest = await canvasToWebp(canvas, lowQuality);

      if (smallest.size <= safeTargetBytes) {
        best = smallest;
        for (let qualityAttempt = 0; qualityAttempt < 7; qualityAttempt += 1) {
          const quality = (lowQuality + highQuality) / 2;
          const candidate = await canvasToWebp(canvas, quality);
          if (candidate.size <= safeTargetBytes) {
            best = candidate;
            lowQuality = quality;
          } else {
            highQuality = quality;
          }
        }
      }

      if (best) {
        const output = new File([best], webpFileName(file.name), {
          type: 'image/webp',
          lastModified: Date.now()
        });
        return {
          file: output,
          compressed: true,
          originalBytes: file.size,
          outputBytes: output.size
        };
      }

      const nextScale = Math.min(0.86, Math.sqrt(safeTargetBytes / smallest.size) * 0.94);
      width = Math.max(1, Math.round(width * nextScale));
      height = Math.max(1, Math.round(height * nextScale));
    }

    throw new Error(`${options.assetLabel}自动压缩后仍然过大，请更换图片`);
  } catch (error) {
    if (error instanceof Error && error.message.includes(options.assetLabel)) throw error;
    throw new Error(error instanceof Error ? error.message : `${options.assetLabel}无法识别`, {
      cause: error
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
