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
  if (input.packageMode !== 'bilingual-package') {
    throw new AppError('VALIDATION_ERROR', '当前Agent只接受中英对照正式包', 422);
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
