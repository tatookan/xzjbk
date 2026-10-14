import assert from 'node:assert/strict';

import sharp from 'sharp';

import { assertAgentFormalImport } from '../src/modules/agent-import/validation';
import type { CatalogScriptInput } from '../src/modules/script-catalog/contracts';

const input: CatalogScriptInput = {
  title: '正式草稿',
  englishTitle: 'Formal Draft',
  genre: 'BL',
  logline: '一句话故事。',
  synopsis: '故事梗概。',
  directorStatement:
    '制作执行强调情绪节奏表演镜头色彩空间道具连续性避免误读现场调度声音设计人物关系'.repeat(14),
  previewRationale:
    'EP01至EP04建立主角、关系和世界观，以旧契约形成冲突钩子，避开成人内容与结局反转。',
  sourceUnitCount: 80,
  previewUnitLabel: '段',
  presentationMode: '解说',
  packageMode: 'bilingual-package',
  price: 0,
  episodes: 23,
  status: 'draft',
  tags: ['ABO', '契约关系'],
  preview: [{ en: '## EP01\n### English\nA safe opening.', zh: '## EP01\n### 中文\n安全开场。' }],
  previewVisibleCount: 1
};

async function form(width: number, height: number) {
  const result = new FormData();
  const cover = await sharp({
    create: { width, height, channels: 3, background: '#eeeeee' }
  })
    .png()
    .toBuffer();
  result.set('cover', new File([Uint8Array.from(cover)], 'cover.png', { type: 'image/png' }));
  return result;
}

async function main() {
  await assertAgentFormalImport(input, await form(1024, 1536));
  await assert.rejects(
    assertAgentFormalImport({ ...input, packageMode: 'parallel-production' }, await form(2, 3)),
    /只接受中英对照正式包/
  );
  await assert.rejects(
    assertAgentFormalImport({ ...input, genre: 'ABO' }, await form(2, 3)),
    /genre只能是BL、GL或GB/
  );
  await assert.rejects(assertAgentFormalImport(input, await form(1000, 1400)), /精确2:3/);
  await assert.rejects(
    assertAgentFormalImport(
      { ...input, preview: [{ en: 'A nude body.', zh: '裸体。' }] },
      await form(2, 3)
    ),
    /成人或平台安全检查/
  );

  console.log('PASS Agent server formal validation (5 scenarios)');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
