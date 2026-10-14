import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  AGENT_API_VERSION,
  AGENT_SKILL_DOWNLOAD_PATH,
  AGENT_SKILL_VERSION
} from '@/modules/agent-access/version';
import { withApiHandler } from '@/shared/api/handler';
import { getServerEnv } from '@/shared/config/server-env';

export function GET(request: Request) {
  return withApiHandler(request, async () => {
    const archive = await readFile(join(process.cwd(), 'public', AGENT_SKILL_DOWNLOAD_PATH));
    const baseUrl = getServerEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, '');
    return {
      data: {
        apiVersion: AGENT_API_VERSION,
        latestSkillVersion: AGENT_SKILL_VERSION,
        minimumSkillVersion: AGENT_SKILL_VERSION,
        downloadUrl: `${baseUrl}${AGENT_SKILL_DOWNLOAD_PATH}?v=${AGENT_SKILL_VERSION}`,
        sha256: createHash('sha256').update(archive).digest('hex'),
        releasedAt: '2026-09-13',
        releaseNotes:
          '正式工作流升级：中英对照包、只读选材、确定性预检、独立发布包、完整EP试读和制作执行摘要。'
      },
      headers: { 'Cache-Control': 'public, max-age=300, must-revalidate' }
    };
  });
}
