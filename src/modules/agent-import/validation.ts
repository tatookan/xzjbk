import sharp from 'sharp';

import type { CatalogScriptInput } from '@/modules/script-catalog/contracts';
import { AppError } from '@/shared/api/errors';

const AGENT_GENRES = new Set(['BL', 'GL', 'GB']);
const UNSAFE_PREVIEW =
  /(?:强奸|轮奸|性器官|阴茎|阴道|裸体|全裸|插入|射精|口交|肛交|性侵|迷奸|肢解|开膛|断肢|爆头|斩首|rape|genitals?|penis|vagina|nude|naked|penetrat|ejaculat|sexual assault|non[- ]?consensual|dismember|disembowel|decapitat)/i;

function chineseCharacterCount(value: string): number {
  return [...value].filter((character) => /[\u3400-\u9fff]/.test(character)).length;
}

function requireFile(formData: FormData, name: string): File {
  const value = formData.get(name);
  if (!(value instanceof File) || value.size === 0) {
    throw new AppError('VALIDATION_ERROR', `请选择${name}`, 422);
  }
  return value;
}

export async function assertAgentFormalImport(
  input: CatalogScriptInput,
  formData: FormData
): Promise<void> {
  // 演绎模式走独立校验
  if (input.packageMode === 'performance-cn' || input.packageMode === 'performance-intl') {
    return assertAgentPerformanceImport(input, formData);
  }

  if (input.packageMode !== 'bilingual-package') {
    throw new AppError('VALIDATION_ERROR', '当前Agent只接受中英对照正式包或演绎剧本包', 422);
  }
  if (!AGENT_GENRES.has(input.genre)) {
    throw new AppError('VALIDATION_ERROR', 'Agent导入的genre只能是BL、GL或GB', 422);
  }
  if (input.previewUnitLabel !== '段') {
    throw new AppError('VALIDATION_ERROR', 'Agent导入的试读单位必须为“段”', 422);
  }
  if (input.preview.length > 4) {
    throw new AppError('VALIDATION_ERROR', 'Agent正式试读最多包含4个完整EP', 422);
  }
  const directorLength = chineseCharacterCount(input.directorStatement);
  if (directorLength < 500 || directorLength > 1000) {
    throw new AppError(
      'VALIDATION_ERROR',
      `制作执行摘要须为500–1000个中文字符，当前${directorLength}个`,
      422
    );
  }
  if (!input.previewRationale.trim()) {
    throw new AppError('VALIDATION_ERROR', '请填写具体的试读选择理由', 422);
  }
  if (input.tags.some((tag) => AGENT_GENRES.has(tag.toUpperCase()))) {
    throw new AppError('VALIDATION_ERROR', 'genre不能重复写入tags', 422);
  }
  const normalizedTags = input.tags.map((tag) => tag.replaceAll(/\s/g, '').toLowerCase());
  if (new Set(normalizedTags).size !== normalizedTags.length) {
    throw new AppError('VALIDATION_ERROR', 'tags存在重复项', 422);
  }
  const previewText = input.preview.map((item) => `${item.en}\n${item.zh}`).join('\n');
  if (UNSAFE_PREVIEW.test(previewText)) {
    throw new AppError('VALIDATION_ERROR', '试读触发成人或平台安全检查，请更换正式安全试读', 422);
  }

  const cover = requireFile(formData, 'cover');
  try {
    const metadata = await sharp(Buffer.from(await cover.arrayBuffer()), {
      animated: false,
      limitInputPixels: 40_000_000
    }).metadata();
    if (!metadata.width || !metadata.height || metadata.width * 3 !== metadata.height * 2) {
      throw new AppError(
        'VALIDATION_ERROR',
        `Agent封面必须是精确2:3，实际为${metadata.width ?? '?'}×${metadata.height ?? '?'}`,
        422
      );
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('VALIDATION_ERROR', 'Agent封面无法识别', 422);
  }
}


async function assertAgentPerformanceImport(
  input: CatalogScriptInput,
  formData: FormData
): Promise<void> {
  if (input.presentationMode !== '演绎') {
    throw new AppError('VALIDATION_ERROR', '演绎剧本包的呈现形式必须为「演绎」', 422);
  }
  if (input.packageMode === 'performance-cn' && input.market !== 'domestic') {
    throw new AppError('VALIDATION_ERROR', '国内演绎剧本包的market必须为domestic', 422);
  }
  if (input.packageMode === 'performance-intl' && input.market !== 'overseas') {
    throw new AppError('VALIDATION_ERROR', '海外演绎剧本包的market必须为overseas', 422);
  }

  // previewLines 校验
  if (!input.previewLines || input.previewLines.length < 1) {
    throw new AppError('VALIDATION_ERROR', '演绎剧本必须提供至少1集试读', 422);
  }
  if (input.previewLines.length > 5) {
    throw new AppError('VALIDATION_ERROR', '演绎试读最多5集', 422);
  }
  for (const ep of input.previewLines) {
    if (ep.lines.length < 5) {
      throw new AppError('VALIDATION_ERROR', `第${ep.ep}集试读至少需要5行文本`, 422);
    }
    const unsafeText = ep.lines.join('\n');
    if (UNSAFE_PREVIEW.test(unsafeText)) {
      throw new AppError('VALIDATION_ERROR', '试读触发安全检查，请更换试读内容', 422);
    }
  }

  // characters 校验
  if (!input.characters || input.characters.length < 1) {
    throw new AppError('VALIDATION_ERROR', '演绎剧本必须提供人物小传', 422);
  }
  if (input.characters.length > 30) {
    throw new AppError('VALIDATION_ERROR', '人物小传最多30个角色', 422);
  }

  // 文件校验
  if (input.packageMode === 'performance-intl') {
    requireFile(formData, 'secondary'); // 海外需要2个DOCX
  }
  requireFile(formData, 'english'); // 都需要主稿

  // 封面校验
  const cover = requireFile(formData, 'cover');
  try {
    const metadata = await sharp(Buffer.from(await cover.arrayBuffer()), {
      animated: false,
      limitInputPixels: 40_000_000
    }).metadata();
    if (!metadata.width || !metadata.height || metadata.width * 3 !== metadata.height * 2) {
      throw new AppError(
        'VALIDATION_ERROR',
        `Agent封面必须是精确2:3，实际为${metadata.width ?? '?'}×${metadata.height ?? '?'}`,
        422
      );
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('VALIDATION_ERROR', 'Agent封面无法识别', 422);
  }
}
