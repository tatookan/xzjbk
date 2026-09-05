'use client';

import { Icons } from '@/components/icons';
import type { ScriptPreviewLine } from '@/features/script-library/api/types';
import { useScriptLibraryDemo } from '@/features/script-library/components/demo-context';
import { DemoModal } from '@/features/script-library/components/demo-modal';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';

type UploadStep = 'files' | 'details';
type PackageMode = 'bilingual' | 'parallel';
type FileKey = 'english' | 'secondary' | 'director';
type PreviewRow = ScriptPreviewLine & { id: string };

const emptyFiles: Record<FileKey, File | null> = {
  english: null,
  secondary: null,
  director: null
};
const emptyPreviewRow = (id: string): PreviewRow => ({
  id,
  zh: '',
  en: ''
});

const formatDefinitions = {
  bilingual: {
    label: '中英对照包',
    description: '英文版 + 中英对照版 + 导演阐述',
    slots: [
      { key: 'english', label: '英文剧本', description: '购买后交付的完整英文文件' },
      { key: 'secondary', label: '中英对照剧本', description: '购买后交付的完整双语文件' },
      { key: 'director', label: '导演阐述', description: '购买后交付的完整创作说明' }
    ],
    sampleFiles: {
      english: 'The NPC Butler Gets Bullied Again-US-localized-English.md',
      secondary: 'The NPC Butler Gets Bullied Again-US-localized-bilingual.md',
      director: 'The NPC Butler Gets Bullied Again-导演阐述.md'
    },
    cover: '/portal/cover-npc-butler.png',
    sampleCoverName: 'npc-butler-cover.png',
    defaults: {
      title: 'NPC 管家又被欺负了',
      englishTitle: 'The NPC Butler Gets Bullied Again',
      genre: 'BL 无限流',
      episodes: 60,
      presentationMode: '演绎' as const,
      tags: '无限流, 失忆, 群像救援',
      sourceUnitCount: 425,
      previewUnitLabel: '段' as const,
      logline:
        '失忆的顶级玩家被系统当成 NPC 管家，四名昔日伙伴闯入崩溃副本救他，却被他误解为集体霸凌。',
      synopsis:
        'Blake Young 坚信自己只是必须遵守行为守则的庄园管家。四名不该出现在 B 级副本的 S 级玩家相继闯入，随着庄园转入 Otherworld，他被抹除的真实身份逐渐浮出水面。',
      directorStatement:
        '这不是一场单纯的副本逃生，而是一场关于记忆、身份与被遗忘之爱的救援。镜头始终贴近 Blake 的受限认知，让观众比他更早感受到四名玩家行为背后的保护与痛苦。',
      previewRationale:
        '试读覆盖世界设定、主角处境与第一次正面冲突，在身份反转和核心救援真相揭晓前结束。'
    },
    preview: [
      {
        en: 'The manor had rules for everything—even the angle at which a butler was allowed to bow.',
        zh: '庄园里的一切都有规矩——甚至连管家鞠躬的角度也不例外。'
      },
      {
        en: 'Blake tightened his white gloves. The four guests at the door looked at him as if they had found a ghost.',
        zh: '布莱克收紧白手套。门前的四位客人看着他，仿佛终于找到了一个幽灵。'
      }
    ]
  },
  parallel: {
    label: '双制作稿',
    description: '中文制作版 + English Production + 导演阐述',
    slots: [
      { key: 'english', label: '英文制作稿', description: '购买后交付的英文制作文件' },
      { key: 'secondary', label: '中文制作稿', description: '购买后交付的中文制作文件' },
      { key: 'director', label: '导演阐述', description: '购买后交付的完整创作说明' }
    ],
    sampleFiles: {
      english: 'Vampire Care Manual_English_Production.md',
      secondary: 'Vampire Care Manual_中文版_制作版.md',
      director: 'Vampire Care Manual-导演阐述.md'
    },
    cover: '/portal/cover-vampire-care-manual.png',
    sampleCoverName: 'vampire-care-manual-cover.png',
    defaults: {
      title: '吸血鬼饲养手册',
      englishTitle: 'Vampire Care Manual',
      genre: '都市奇幻',
      episodes: 13,
      presentationMode: '解说' as const,
      tags: '吸血鬼, 城堡, 留学生',
      sourceUnitCount: 28,
      previewUnitLabel: '场' as const,
      logline:
        '一名拮据的留学生收到温莎城堡的高薪工作邀约，从此被卷入一套危险又荒诞的吸血鬼生存规则。',
      synopsis:
        '一份远超常理的工作邀约，把主人公带进隐藏于现代社会中的吸血鬼世界。日常生存、超自然规则与人物关系在城堡内不断碰撞。',
      directorStatement:
        '作品以现代职场语感进入古老吸血鬼秩序，用日常细节承接超自然危险。视觉上保持城堡的真实尺度，让荒诞感从人物反应而不是奇观堆砌中产生。',
      previewRationale:
        '试读保留开场场景中的人物、动作、对白和必要制作信息，在第一个危险规则出现后收束。'
    },
    preview: [
      {
        en: 'EXT. CAMPUS - DAY. LIN MAN stops beneath an old stone arch and answers an unknown call.',
        zh: '外景 校园 日。林曼停在古老的石拱门下，接起一通陌生来电。'
      },
      {
        en: 'BUTLER BAI (V.O.): Would you be interested in working at Windsor Castle?',
        zh: '白管家（画外音）：你愿意来温莎城堡工作吗？'
      }
    ]
  }
} satisfies Record<
  PackageMode,
  {
    label: string;
    description: string;
    slots: { key: FileKey; label: string; description: string }[];
    sampleFiles: Record<FileKey, string>;
    cover: string;
    sampleCoverName: string;
    defaults: {
      title: string;
      englishTitle: string;
      genre: string;
      episodes: number;
      presentationMode: '解说' | '演绎';
      tags: string;
      sourceUnitCount: number;
      previewUnitLabel: '段' | '场';
      logline: string;
      synopsis: string;
      directorStatement: string;
      previewRationale: string;
    };
    preview: ScriptPreviewLine[];
  }
>;

export function ScriptUploadFlow({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { createScript } = useScriptLibraryDemo();
  const [packageMode, setPackageMode] = useState<PackageMode>('bilingual');
  const [step, setStep] = useState<UploadStep>('files');
  const [files, setFiles] = useState<Record<FileKey, File | null>>(emptyFiles);
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([
    emptyPreviewRow('preview-initial')
  ]);
  const definition = formatDefinitions[packageMode];
  const allFilesReady = Object.values(files).every(Boolean);

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  const closeFlow = () => {
    setStep('files');
    setPackageMode('bilingual');
    setFiles({ ...emptyFiles });
    setCover(null);
    setCoverPreview(null);
    setPreviewRows([emptyPreviewRow('preview-reset')]);
    onClose();
  };

  const useSample = () => {
    setPreviewRows(
      definition.preview.map((line, index) => ({ ...line, id: `sample-${packageMode}-${index}` }))
    );
    toast.info(`已填入${definition.label}演示文案，请继续选择真实文件和封面`);
  };

  const switchPackageMode = (nextMode: PackageMode) => {
    setPackageMode(nextMode);
    setFiles({ ...emptyFiles });
    setCover(null);
    setCoverPreview(null);
    setPreviewRows([emptyPreviewRow(`preview-${nextMode}`)]);
  };

  const updatePreviewRow = (id: string, field: 'zh' | 'en', value: string) => {
    setPreviewRows((rows) => rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const handlePublish = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const completedPreview = previewRows
      .map(({ zh, en }) => ({ zh: zh.trim(), en: en.trim() }))
      .filter((row) => row.zh && row.en);

    if (!cover) {
      toast.error('请上传剧本封面');
      return;
    }
    if (!completedPreview.length || completedPreview.length !== previewRows.length) {
      toast.error('每个试读单元都需要填写中文和英文内容');
      return;
    }

    const data = new FormData(event.currentTarget);
    data.set(
      'tags',
      JSON.stringify(
        String(data.get('tags') ?? '')
          .split(/[,，]/)
          .map((tag) => tag.trim())
          .filter(Boolean)
      )
    );
    data.set('preview', JSON.stringify(completedPreview));
    data.set(
      'packageMode',
      packageMode === 'parallel' ? 'parallel-production' : 'bilingual-package'
    );
    data.set('status', 'draft');
    data.set('cover', cover);
    data.set('english', files.english!);
    data.set('secondary', files.secondary!);
    data.set('director', files.director!);

    setSaving(true);
    const result = await createScript(data);
    setSaving(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
    closeFlow();
  };

  return (
    <DemoModal
      open={open}
      onClose={closeFlow}
      title='新建剧本项目'
      eyebrow='Manual entry'
      size='wide'
    >
      <div className='mb-8 grid grid-cols-2 border-y border-white/10 text-xs'>
        {[
          ['01 上传原文件', step === 'files'],
          ['02 填写展示内容', step === 'details']
        ].map(([label, active]) => (
          <div
            key={String(label)}
            className={cn(
              'px-3 py-3 text-center',
              active ? 'bg-white/7 text-white' : 'text-white/28'
            )}
          >
            {label}
          </div>
        ))}
      </div>

      {step === 'files' ? (
        <div>
          <div className='mb-6 grid gap-3 sm:grid-cols-2'>
            {(Object.keys(formatDefinitions) as PackageMode[]).map((mode) => {
              const option = formatDefinitions[mode];
              const active = mode === packageMode;
              return (
                <button
                  key={mode}
                  type='button'
                  onClick={() => switchPackageMode(mode)}
                  className={cn(
                    'border p-4 text-left transition-colors',
                    active
                      ? 'border-[#d84a3f] bg-[#d84a3f]/5'
                      : 'border-white/10 text-white/42 hover:border-white/28'
                  )}
                >
                  <span className='flex items-center justify-between gap-4'>
                    <strong className={cn('text-sm font-medium', active && 'text-white')}>
                      {option.label}
                    </strong>
                    <span className='font-mono text-[9px] text-[#d84a3f]'>
                      {active ? 'SELECTED' : 'FORMAT'}
                    </span>
                  </span>
                  <span className='mt-2 block text-xs leading-5 opacity-65'>
                    {option.description}
                  </span>
                </button>
              );
            })}
          </div>

          <div className='grid gap-3 md:grid-cols-3'>
            {definition.slots.map((slot, index) => (
              <label
                key={slot.key}
                className={cn(
                  'min-h-48 cursor-pointer border p-5 transition-colors',
                  files[slot.key]
                    ? 'border-[#d84a3f] bg-[#d84a3f]/5'
                    : 'border-dashed border-white/14 hover:border-white/30'
                )}
              >
                <span className='flex items-center justify-between'>
                  <span className='font-mono text-xs text-[#d84a3f]'>0{index + 1}</span>
                  {files[slot.key] ? (
                    <Icons.circleCheck className='text-[#d84a3f]' size={17} />
                  ) : (
                    <Icons.upload className='text-white/30' size={17} />
                  )}
                </span>
                <strong className='mt-7 block text-sm font-medium'>{slot.label}</strong>
                <span className='mt-2 block text-xs leading-5 text-white/34'>
                  {slot.description}
                </span>
                <span className='mt-5 block truncate text-[10px] text-white/46'>
                  {files[slot.key]?.name || '选择 Word、TXT 或 Markdown'}
                </span>
                <input
                  type='file'
                  accept='.doc,.docx,.txt,.md'
                  className='sr-only'
                  onChange={(event) =>
                    setFiles((current) => ({
                      ...current,
                      [slot.key]: event.target.files?.[0] ?? null
                    }))
                  }
                />
              </label>
            ))}
          </div>

          <div className='mt-6 grid gap-5 border border-white/10 bg-white/[0.025] p-5 md:grid-cols-[1fr_auto] md:items-center'>
            <div>
              <p className='text-sm'>文件按原样保存</p>
              <p className='mt-2 max-w-2xl text-xs leading-5 text-white/34'>
                系统不会读取文件内容。标题、简介、导演阐述、标签和前台试读，都由上传者在下一步明确填写。
              </p>
            </div>
            <button
              type='button'
              onClick={useSample}
              className='h-10 border border-white/14 px-4 text-xs text-white/60 transition-colors hover:border-white/32 hover:text-white'
            >
              载入{definition.label}演示文案
            </button>
          </div>

          <div className='mt-6 flex justify-end gap-3'>
            <button type='button' onClick={closeFlow} className='h-11 px-5 text-sm text-white/42'>
              取消
            </button>
            <button
              type='button'
              disabled={!allFilesReady}
              onClick={() => setStep('details')}
              className='flex h-11 items-center justify-center gap-2 bg-[#d84a3f] px-5 text-sm font-semibold text-[#130f0f] disabled:cursor-not-allowed disabled:opacity-35'
            >
              下一步，填写内容 <Icons.arrowRight size={16} />
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handlePublish}>
          <div className='grid gap-8 lg:grid-cols-[1fr_320px]'>
            <div className='space-y-5'>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <p className='text-sm font-medium'>前台展示资料</p>
                  <p className='mt-1 text-xs text-white/34'>以下内容全部由上传者填写</p>
                </div>
                <button
                  type='button'
                  onClick={() => setStep('files')}
                  className='text-xs text-white/40 hover:text-white'
                >
                  返回文件
                </button>
              </div>

              <div className='grid gap-4 sm:grid-cols-2'>
                <Field label='中文展示名'>
                  <input
                    name='title'
                    required
                    defaultValue={definition.defaults.title}
                    className={inputClass}
                  />
                </Field>
                <Field label='英文原名'>
                  <input
                    name='englishTitle'
                    required
                    defaultValue={definition.defaults.englishTitle}
                    className={inputClass}
                  />
                </Field>
                <Field label='题材类型'>
                  <input
                    name='genre'
                    required
                    defaultValue={definition.defaults.genre}
                    className={inputClass}
                  />
                </Field>
                <Field label='定价积分'>
                  <input
                    name='price'
                    type='number'
                    min='1'
                    required
                    defaultValue='4800'
                    className={inputClass}
                  />
                </Field>
                <Field label='成片形式'>
                  <select
                    name='presentationMode'
                    defaultValue={definition.defaults.presentationMode}
                    className={selectClass}
                  >
                    <option value='演绎'>演绎</option>
                    <option value='解说'>解说</option>
                  </select>
                </Field>
                <Field label='集数'>
                  <input
                    name='episodes'
                    type='number'
                    min='1'
                    required
                    defaultValue={definition.defaults.episodes}
                    className={inputClass}
                  />
                </Field>
                <Field label='标签（逗号分隔）'>
                  <input
                    name='tags'
                    required
                    defaultValue={definition.defaults.tags}
                    className={inputClass}
                  />
                </Field>
                <div className='grid grid-cols-[1fr_88px] gap-3'>
                  <Field label='全文单元数'>
                    <input
                      name='sourceUnitCount'
                      type='number'
                      min={previewRows.length}
                      required
                      defaultValue={definition.defaults.sourceUnitCount}
                      className={inputClass}
                    />
                  </Field>
                  <Field label='单位'>
                    <select
                      name='previewUnitLabel'
                      defaultValue={definition.defaults.previewUnitLabel}
                      className={selectClass}
                    >
                      <option value='段'>段</option>
                      <option value='场'>场</option>
                    </select>
                  </Field>
                </div>
              </div>

              <Area
                label='一句话故事'
                name='logline'
                rows={3}
                value={definition.defaults.logline}
              />
              <Area
                label='故事梗概'
                name='synopsis'
                rows={4}
                value={definition.defaults.synopsis}
              />
              <Area
                label='导演阐述（详情页展示内容）'
                name='directorStatement'
                rows={5}
                value={definition.defaults.directorStatement}
              />
            </div>

            <aside>
              <div className='border border-white/10 p-4'>
                <p className='text-sm font-medium'>剧本封面</p>
                <div className='mt-4 grid grid-cols-[92px_1fr] gap-4'>
                  <div className='relative aspect-[2/3] overflow-hidden bg-white/[0.03]'>
                    {coverPreview ? (
                      <Image
                        src={coverPreview}
                        alt='剧本封面预览'
                        fill
                        className='object-cover'
                        sizes='92px'
                      />
                    ) : (
                      <span className='grid h-full place-items-center text-white/20'>
                        <Icons.media size={22} />
                      </span>
                    )}
                  </div>
                  <div className='min-w-0 py-1'>
                    <p className='truncate text-xs text-white/52'>
                      {cover?.name || '尚未选择封面'}
                    </p>
                    <p className='mt-2 text-[10px] leading-5 text-white/28'>
                      建议竖版 2:3，JPG 或 PNG
                    </p>
                    <label className='mt-4 inline-flex cursor-pointer items-center gap-2 text-[10px] text-[#d9685e] hover:text-[#ec7c72]'>
                      <Icons.upload size={13} /> {cover ? '更换封面' : '上传封面'}
                      <input
                        type='file'
                        accept='image/jpeg,image/png,image/webp'
                        className='sr-only'
                        onChange={(event) => {
                          const nextCover = event.target.files?.[0] ?? null;
                          setCover(nextCover);
                          setCoverPreview(nextCover ? URL.createObjectURL(nextCover) : null);
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className='mt-4 border border-white/10 p-5'>
                <p className='text-sm font-medium'>已上传文件</p>
                <div className='mt-4 space-y-3'>
                  {definition.slots.map((slot) => (
                    <div key={slot.key} className='grid grid-cols-[18px_1fr] gap-3'>
                      <Icons.circleCheck size={15} className='text-[#d84a3f]' />
                      <div className='min-w-0'>
                        <p className='text-xs text-white/58'>{slot.label}</p>
                        <p className='mt-1 truncate text-[10px] text-white/26'>
                          {files[slot.key]?.name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className='mt-4 border-l-2 border-[#d84a3f] bg-white/[0.025] p-4'>
                <p className='text-xs text-white/68'>展示内容与原文件分开保存</p>
                <p className='mt-2 text-[10px] leading-5 text-white/30'>
                  前台只接收本页填写的资料和试读内容，完整交付文件只在购买成功后提供下载。
                </p>
              </div>
            </aside>
          </div>

          <section className='mt-9 border-t border-white/10 pt-7'>
            <div className='flex flex-col justify-between gap-4 sm:flex-row sm:items-end'>
              <div>
                <p className='text-sm font-medium'>白名单试读内容</p>
                <p className='mt-2 max-w-2xl text-xs leading-5 text-white/34'>
                  每个单元分别粘贴中文和英文剧本。换行、空行与缩进会按输入原样显示，系统不会把多行内容合并成一段。
                </p>
              </div>
              <button
                type='button'
                onClick={() =>
                  setPreviewRows((rows) => [...rows, emptyPreviewRow(`preview-${Date.now()}`)])
                }
                className='inline-flex h-9 items-center gap-2 border border-white/14 px-3 text-xs text-white/54 hover:border-white/30 hover:text-white'
              >
                <Icons.add size={14} /> 添加试读单元
              </button>
            </div>

            <div className='mt-5 space-y-4'>
              {previewRows.map((row, index) => (
                <div key={row.id} className='border border-white/10 p-4'>
                  <div className='mb-4 flex items-center justify-between'>
                    <span className='font-mono text-[10px] text-[#d84a3f]'>
                      PREVIEW {String(index + 1).padStart(2, '0')}
                    </span>
                    {previewRows.length > 1 ? (
                      <button
                        type='button'
                        onClick={() =>
                          setPreviewRows((rows) => rows.filter((item) => item.id !== row.id))
                        }
                        className='text-white/24 hover:text-[#d9685e]'
                        aria-label={`删除试读单元 ${index + 1}`}
                      >
                        <Icons.trash size={14} />
                      </button>
                    ) : null}
                  </div>
                  <div className='grid gap-4 md:grid-cols-2'>
                    <label className='text-xs text-white/42'>
                      中文内容 · 保留逐行排版
                      <textarea
                        required
                        rows={8}
                        spellCheck={false}
                        value={row.zh}
                        onChange={(event) => updatePreviewRow(row.id, 'zh', event.target.value)}
                        className={previewClass}
                      />
                    </label>
                    <label className='text-xs text-white/42'>
                      英文内容 · Keep line breaks
                      <textarea
                        required
                        rows={8}
                        spellCheck={false}
                        value={row.en}
                        onChange={(event) => updatePreviewRow(row.id, 'en', event.target.value)}
                        className={previewClass}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <Area
              label='试读结束说明'
              name='previewRationale'
              rows={3}
              value={definition.defaults.previewRationale}
              className='mt-5'
            />
          </section>

          <div className='mt-8 flex flex-col justify-between gap-4 border-t border-white/10 pt-5 sm:flex-row sm:items-center'>
            <p className='text-xs leading-5 text-white/30'>
              保存后先进入草稿。管理员确认首页卡片和详情页后，再正式上架。
            </p>
            <div className='flex gap-3'>
              <button type='button' onClick={closeFlow} className='h-11 px-5 text-sm text-white/42'>
                取消
              </button>
              <button
                type='submit'
                disabled={saving}
                className='h-11 bg-[#d84a3f] px-6 text-sm font-semibold text-[#130f0f] disabled:cursor-wait disabled:opacity-55'
              >
                {saving ? '正在安全保存…' : '保存草稿并预览'}
              </button>
            </div>
          </div>
        </form>
      )}
    </DemoModal>
  );
}

const inputClass =
  'mt-2 h-11 w-full border border-white/14 bg-white/[0.025] px-3 text-sm text-white outline-none focus:border-[#d84a3f]';
const selectClass =
  'mt-2 h-11 w-full border border-white/14 bg-[#121318] px-3 text-sm text-white outline-none focus:border-[#d84a3f]';
const previewClass =
  'mt-2 w-full resize-y whitespace-pre-wrap border border-white/12 bg-white/[0.025] p-3 font-mono text-[13px] leading-6 text-white outline-none [tab-size:4] focus:border-[#d84a3f]';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className='text-xs text-white/52'>
      {label}
      {children}
    </label>
  );
}

function Area({
  label,
  name,
  rows,
  value,
  className
}: {
  label: string;
  name: string;
  rows: number;
  value: string;
  className?: string;
}) {
  return (
    <label className={cn('block text-xs text-white/52', className)}>
      {label}
      <textarea
        name={name}
        required
        rows={rows}
        defaultValue={value}
        className='mt-2 w-full resize-none border border-white/14 bg-white/[0.025] p-3 text-sm leading-6 text-white outline-none focus:border-[#d84a3f]'
      />
    </label>
  );
}
