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
  .min(1, '至少填写一个试读单元')
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
    packageMode: z.enum(['bilingual-package', 'parallel-production']),
    price: z.coerce.number().int().positive().max(100_000_000),
    episodes: z.coerce.number().int().positive().max(100_000),
    status: z.enum(['draft', 'available']),
    tags: z.array(z.string().trim().min(1).max(40)).max(20),
    preview: previewSchema,
    previewVisibleCount: z.coerce.number().int().positive().max(80)
  })
  .superRefine((value, context) => {
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
    previewVisibleCount:
      stringField(formData, 'previewVisibleCount') || String(fallbackVisibleCount)
  });
}
