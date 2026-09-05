import { z } from 'zod';

export const pointsAdjustmentSchema = z.object({
  delta: z.coerce.number().int().min(-100_000_000).max(100_000_000).refine(Boolean, {
    message: '心源调整数量不能为 0'
  }),
  note: z.string().trim().min(2, '请填写调整原因').max(300, '调整原因不能超过 300 字')
});
