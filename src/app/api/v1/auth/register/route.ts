import { hashPassword } from 'better-auth/crypto';
import { z } from 'zod';

import { registerWithInvite } from '@/modules/identity/invite-code';
import { withApiHandler } from '@/shared/api/handler';
import { assertTrustedOrigin, readJson } from '@/shared/api/request';

const registrationSchema = z.object({
  name: z.string().trim().min(2, '姓名至少需要 2 个字符').max(50),
  email: z.email('请输入有效邮箱').transform((value) => value.toLowerCase()),
  password: z.string().min(8, '密码至少需要 8 位').max(128),
  inviteCode: z.string().trim().min(12, '请输入有效注册码').max(64)
});

export function POST(request: Request) {
  return withApiHandler(request, async () => {
    assertTrustedOrigin(request);
    const input = registrationSchema.parse(await readJson(request));
    const passwordHash = await hashPassword(input.password);
    const user = await registerWithInvite({ ...input, passwordHash });

    return { data: { user }, status: 201 };
  });
}
