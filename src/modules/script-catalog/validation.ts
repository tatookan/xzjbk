import { z } from 'zod';

import { AppError } from '@/shared/api/errors';

import type { CatalogScriptInput } from './contracts';

const previewSchema = z
  .array(
    z.object({
      zh: z
        .string()
        .max(30_000)
        .refine((value) => value.trim().length > 0, '中文试读不能为空'),
      en: z
        .string()
        .max(30_000)
        .refine((value) => value.trim().length > 0, '英文试读不能为空')
    })
  )
  .min(0)
  .max(80, '试读单元不能超过 80 个');

const scriptInputSchema = z
  .object({
    title: z.string().trim().min(1, '请填写中文剧名').max(120),
    englishTitle: z.string().trim().min(1, '请填写英文剧名').max(180),
    genre: z.string().trim().min(1, '请填写题材').max(80),
    logline: z.string().trim().min(1, '请填写一句话故事').max(600),
    synopsis: z.string().trim().min(1, '请填写故事梗概').max(8_000),
    directorStatement: z.string().trim().min(1, '请填写导演阐述').max(30_000),
    previewRationale: z.string().trim().max(1_000),
    sourceUnitCount: z.coerce.number().int().positive().max(100_000),
    previewUnitLabel: z.enum(['段', '场']),
    presentationMode: z.enum(['解说', '演绎']),
    packageMode: z.enum(['bilingual-package', 'parallel-production', 'performance-cn', 'performance-intl']),
    price: z.coerce.number().int().nonnegative().max(100_000_000),
    episodes: z.coerce.number().int().positive().max(100_000),
    status: z.enum(['draft', 'available']),
    tags: z.array(z.string().trim().min(1).max(40)).max(20),
    preview: previewSchema,
    market: z.enum(['domestic', 'overseas']).optional(),
    previewLines: z.array(z.object({
      ep: z.number().int().positive(),
      lines: z.array(z.string().max(10_000)).max(500)
    })).max(10).optional(),
    characters: z.array(z.object({
      name: z.string().trim().min(1).max(50),
      label: z.string().trim().min(1).max(80),
      role: z.string().trim().max(200).optional(),
      intro: z.array(z.string().max(5_000)).max(20)
    })).max(30).optional(),
    previewVisibleCount: z.coerce.number().int().positive().max(80)
  })
  .superRefine((value, context) => {
    const isPerformance =
      value.packageMode === 'performance-cn' || value.packageMode === 'performance-intl';
    if (isPerformance) {
      // 演绎模式：preview（中英对照段）不适用，previewLines 由 Agent/API 提供
      if (value.preview.length === 0) return; // 跳过后续 preview 校验
    }
    if (value.status === 'available' && value.price < 1) {
      context.addIssue({
        code: 'custom',
        path: ['price'],
        message: '正式上架前必须设置大于零的价格'
      });
    }
    if (value.sourceUnitCount < value.preview.length) {
      context.addIssue({
        code: 'custom',
        path: ['sourceUnitCount'],
        message: '全文单元数不能小于试读单元数'
      });
    }
    if (value.previewVisibleCount > value.preview.length) {
      context.addIssue({
        code: 'custom',
        path: ['previewVisibleCount'],
        message: '开放试读数量不能超过已填写试读数量'
      });
    }
  });

function stringField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

function parseJson(value: string, field: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new AppError('VALIDATION_ERROR', `${field}格式无效`, 422);
  }
}

export function readCatalogScriptInput(formData: FormData): CatalogScriptInput {
  const preview = parseJson(stringField(formData, 'preview') || '[]', '试读内容');
  const fallbackVisibleCount = Array.isArray(preview) ? preview.length : 0;
  const packageMode = stringField(formData, 'packageMode');
  const isPerformance = packageMode === 'performance-cn' || packageMode === 'performance-intl';
  const market = stringField(formData, 'market') || (packageMode === 'performance-cn' ? 'domestic' : 'overseas');
  const previewLines = isPerformance ? parseJson(stringField(formData, 'previewLines') || '[]', '演绎试读') : undefined;
  const characters = isPerformance ? parseJson(stringField(formData, 'characters') || '[]', '人物小传') : undefined;
  return scriptInputSchema.parse({
    title: stringField(formData, 'title'),
    englishTitle: stringField(formData, 'englishTitle'),
    genre: stringField(formData, 'genre'),
    logline: stringField(formData, 'logline'),
    synopsis: stringField(formData, 'synopsis'),
    directorStatement: stringField(formData, 'directorStatement'),
    previewRationale: stringField(formData, 'previewRationale'),
    sourceUnitCount: stringField(formData, 'sourceUnitCount'),
    previewUnitLabel: stringField(formData, 'previewUnitLabel'),
    presentationMode: stringField(formData, 'presentationMode'),
    packageMode: stringField(formData, 'packageMode'),
    price: stringField(formData, 'price'),
    episodes: stringField(formData, 'episodes'),
    status: stringField(formData, 'status') || 'draft',
    tags: parseJson(stringField(formData, 'tags') || '[]', '标签'),
    preview,
    market,
    previewLines,
    characters,
    previewVisibleCount:
      stringField(formData, 'previewVisibleCount') || String(fallbackVisibleCount)
  });
}
