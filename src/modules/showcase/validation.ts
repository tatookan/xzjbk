import { z } from 'zod';

import type { ShowcasePosterInput } from './contracts';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined);

const posterInputSchema = z
  .object({
    title: z.string().trim().min(1, '请填写海报标题').max(80, '标题不能超过 80 个字'),
    subtitle: optionalText(140),
    linkType: z.enum(['none', 'script', 'external']),
    linkedScriptId: optionalText(80),
    externalUrl: optionalText(500),
    published: z.boolean()
  })
  .superRefine((input, context) => {
    if (input.linkType === 'script' && !input.linkedScriptId) {
      context.addIssue({
        code: 'custom',
        path: ['linkedScriptId'],
        message: '请选择要跳转的剧本'
      });
    }

    if (input.linkType === 'external') {
      if (!input.externalUrl) {
        context.addIssue({
          code: 'custom',
          path: ['externalUrl'],
          message: '请填写跳转地址'
        });
        return;
      }

      try {
        const url = new URL(input.externalUrl);
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported protocol');
      } catch {
        context.addIssue({
          code: 'custom',
          path: ['externalUrl'],
          message: '请输入以 http:// 或 https:// 开头的完整地址'
        });
      }
    }
  });

function getOptionalString(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  return typeof value === 'string' ? value : undefined;
}

export function readPosterInput(formData: FormData): ShowcasePosterInput {
  return posterInputSchema.parse({
    title: getOptionalString(formData, 'title') ?? '',
    subtitle: getOptionalString(formData, 'subtitle'),
    linkType: getOptionalString(formData, 'linkType') ?? 'none',
    linkedScriptId: getOptionalString(formData, 'linkedScriptId'),
    externalUrl: getOptionalString(formData, 'externalUrl'),
    published: getOptionalString(formData, 'published') === 'true'
  });
}

export const reorderPostersSchema = z.object({
  orderedIds: z.array(z.string().uuid()).max(100)
});
