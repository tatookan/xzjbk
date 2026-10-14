'use client';

import { Icons } from '@/components/icons';
import type { DemoScript, ScriptStatus } from '@/features/script-library/api/types';
import { DemoModal } from '@/features/script-library/components/demo-modal';
import { useScriptLibraryDemo } from '@/features/script-library/components/demo-context';
import { FileDropTarget } from '@/features/script-library/components/file-drop-target';
import { formatUploadBytes, IMAGE_UPLOAD_ACCEPT, prepareImageForUpload } from '@/lib/image-upload';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';

const SCRIPT_COVER_MAX_BYTES = 12 * 1024 * 1024;

function getFiles(script: DemoScript) {
  return [
    script.deliverables.script,
    script.deliverables.chinese ?? script.deliverables.bilingual,
    script.deliverables.directorStatement
  ].filter((file): file is string => Boolean(file));
}

export function ScriptEditor({ script, onClose }: { script: DemoScript; onClose: () => void }) {
  const { updateScript } = useScriptLibraryDemo();
  const [status, setStatus] = useState<Exclude<ScriptStatus, 'sold'>>(
    script.status === 'draft' ? 'draft' : 'available'
  );
  const sceneBased = script.previewUnitLabel === '场';
  const [previewRows, setPreviewRows] = useState(
    script.preview.length
      ? script.preview.map((line, index) => ({ ...line, id: `preview-${index}` }))
      : [{ id: 'preview-empty', zh: '', en: '' }]
  );
  const [previewStructureChanged, setPreviewStructureChanged] = useState(false);
  const previewMaximum = sceneBased
    ? Math.max(
        1,
        previewStructureChanged
          ? previewRows.length
          : (script.previewSceneBreaks?.length ?? script.previewUnitCount ?? 1)
      )
    : Math.max(1, previewRows.length);
  const [previewAmount, setPreviewAmount] = useState(
    Math.max(
      1,
      sceneBased
        ? (script.previewUnitCount ?? 1)
        : (script.previewVisibleCount ?? script.preview.length)
    )
  );
  const [cover, setCover] = useState<File | undefined>();
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverPreparing, setCoverPreparing] = useState(false);
  const [coverResult, setCoverResult] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const files = getFiles(script);

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  const selectCover = async (file: File) => {
    setCoverPreparing(true);
    setCoverResult(null);
    try {
      const prepared = await prepareImageForUpload(file, {
        assetLabel: '剧本封面',
        maxBytes: SCRIPT_COVER_MAX_BYTES,
        maxSizeLabel: '12 MB',
        maxWidth: 1600,
        maxHeight: 2400
      });
      setCover(prepared.file);
      setCoverPreview(URL.createObjectURL(prepared.file));
      if (prepared.compressed) {
        const result = `${formatUploadBytes(prepared.originalBytes)} → ${formatUploadBytes(prepared.outputBytes)}`;
        setCoverResult(`已自动压缩 · ${result}`);
        toast.success(`封面已自动压缩：${result}`);
      } else {
        setCoverResult(`图片已符合要求 · ${formatUploadBytes(prepared.outputBytes)}`);
        toast.info(`${file.name} 已选择，保存后生效`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '剧本封面处理失败');
    } finally {
      setCoverPreparing(false);
    }
  };

  const updatePreviewRow = (id: string, field: 'zh' | 'en', value: string) => {
    setPreviewRows((rows) => rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const addPreviewRow = () => {
    setPreviewStructureChanged(true);
    setPreviewRows((rows) => [...rows, { id: `preview-${Date.now()}`, zh: '', en: '' }]);
  };

  const removePreviewRow = (id: string) => {
    setPreviewStructureChanged(true);
    setPreviewRows((rows) => {
      const nextRows = rows.filter((row) => row.id !== id);
      setPreviewAmount((amount) => Math.min(amount, Math.max(1, nextRows.length)));
      return nextRows;
    });
  };

  if (script.status === 'sold') {
    return (
      <DemoModal
        open
        onClose={onClose}
        title={`《${script.title}》成交档案`}
        eyebrow='Locked after sale'
        size='wide'
      >
        <div className='grid gap-8 lg:grid-cols-[190px_1fr]'>
          <div className='relative aspect-[3/4.2] overflow-hidden'>
            <Image
              src={script.image}
              alt={`${script.title}封面`}
              fill
              className='object-cover grayscale-[.7]'
              sizes='190px'
            />
          </div>
          <div>
            <div className='border-l-2 border-[#d84a3f] bg-white/[0.025] p-5'>
              <p className='flex items-center gap-2 text-sm text-white/76'>
                <Icons.lock size={16} className='text-[#d84a3f]' /> 已成交，内容已锁定
              </p>
              <p className='mt-3 max-w-2xl text-xs leading-6 text-white/38'>
                为保证独家交易有效，后台不能重新上架、修改价格或替换交付文件。管理员仍可查看交易后的完整详情与订单记录。
              </p>
            </div>
            <div className='mt-7 grid gap-3 sm:grid-cols-3'>
              {files.map((file, index) => (
                <div key={file} className='border border-white/10 p-4'>
                  <span className='font-mono text-[10px] text-[#d84a3f]'>0{index + 1}</span>
                  <p className='mt-4 truncate text-xs text-white/52'>{file}</p>
                </div>
              ))}
            </div>
            <Link
              href={`/scripts/${script.id}`}
              className='mt-7 inline-flex h-11 items-center gap-2 border border-white/14 px-5 text-sm text-white/62 transition-colors hover:border-white/32 hover:text-white'
            >
              查看管理员详情 <Icons.externalLink size={15} />
            </Link>
          </div>
        </div>
      </DemoModal>
    );
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (coverPreparing) {
      toast.info('请等待封面压缩完成');
      return;
    }
    const preview = previewRows.map(({ zh, en }) => ({ zh: zh.trim(), en: en.trim() }));
    if (preview.some((line) => !line.zh || !line.en)) {
      toast.error('每个试读单元都需要填写中文和英文内容');
      return;
    }
    const data = new FormData(event.currentTarget);
    setSaving(true);
    const result = await updateScript({
      id: script.id,
      version: script.version,
      title: String(data.get('title') ?? ''),
      englishTitle: String(data.get('englishTitle') ?? ''),
      genre: String(data.get('genre') ?? ''),
      presentationMode: String(data.get('presentationMode') ?? '演绎') as '解说' | '演绎',
      price: Number(data.get('price') ?? 0),
      episodes: Number(data.get('episodes') ?? 0),
      logline: String(data.get('logline') ?? ''),
      synopsis: String(data.get('synopsis') ?? ''),
      directorStatement: String(data.get('directorStatement') ?? ''),
      tags: String(data.get('tags') ?? '')
        .split(/[,，]/)
        .map((tag) => tag.trim())
        .filter(Boolean),
      sourceUnitCount: Number(data.get('sourceUnitCount') ?? preview.length),
      previewRationale: String(data.get('previewRationale') ?? ''),
      preview,
      previewStructureChanged,
      previewAmount,
      status,
      cover
    });
    setSaving(false);
    if (result.ok) {
      toast.success(result.message);
      onClose();
    } else {
      toast.error(result.message);
    }
  };

  return (
    <DemoModal
      open
      onClose={onClose}
      title={`编辑《${script.title}》`}
      eyebrow='Content workspace'
      size='wide'
    >
      <form onSubmit={handleSubmit}>
        <div className='grid gap-8 xl:grid-cols-[1fr_330px]'>
          <div>
            <div className='mb-6 flex items-center justify-between border-y border-white/10 py-4'>
              <div>
                <p className='text-sm font-medium'>前台展示内容</p>
                <p className='mt-1 text-xs text-white/32'>
                  保存后，首页卡片和详情页立即使用这些字段
                </p>
              </div>
              <Link
                href={`/scripts/${script.id}`}
                className='text-xs text-[#d9685e] hover:text-[#ec7c72]'
              >
                预览详情
              </Link>
            </div>

            <div className='grid gap-4 sm:grid-cols-2'>
              <label className='text-xs text-white/48'>
                中文剧名
                <input
                  name='title'
                  required
                  defaultValue={script.title}
                  className='mt-2 h-11 w-full border border-white/14 bg-white/[0.025] px-3 text-sm text-white outline-none focus:border-[#d84a3f]'
                />
              </label>
              <label className='text-xs text-white/48'>
                英文剧名
                <input
                  name='englishTitle'
                  required
                  defaultValue={script.englishTitle}
                  className='mt-2 h-11 w-full border border-white/14 bg-white/[0.025] px-3 text-sm text-white outline-none focus:border-[#d84a3f]'
                />
              </label>
              <label className='text-xs text-white/48'>
                题材
                <input
                  name='genre'
                  required
                  defaultValue={script.genre}
                  className='mt-2 h-11 w-full border border-white/14 bg-white/[0.025] px-3 text-sm text-white outline-none focus:border-[#d84a3f]'
                />
              </label>
              <label className='text-xs text-white/48'>
                展示类型
                <select
                  name='presentationMode'
                  defaultValue={script.presentationMode}
                  className='mt-2 h-11 w-full border border-white/14 bg-[#18191e] px-3 text-sm text-white outline-none focus:border-[#d84a3f]'
                >
                  <option value='演绎'>演绎</option>
                  <option value='解说'>解说</option>
                </select>
              </label>
              <label className='text-xs text-white/48'>
                独家售价（心源）
                <input
                  name='price'
                  type='number'
                  min='1'
                  required
                  defaultValue={script.price}
                  className='mt-2 h-11 w-full border border-white/14 bg-white/[0.025] px-3 text-sm text-white outline-none focus:border-[#d84a3f]'
                />
              </label>
              <label className='text-xs text-white/48'>
                集数
                <input
                  name='episodes'
                  type='number'
                  min='1'
                  required
                  defaultValue={script.episodes}
                  className='mt-2 h-11 w-full border border-white/14 bg-white/[0.025] px-3 text-sm text-white outline-none focus:border-[#d84a3f]'
                />
              </label>
              <label className='text-xs text-white/48'>
                全文单元数
                <input
                  name='sourceUnitCount'
                  type='number'
                  min={previewRows.length}
                  required
                  defaultValue={script.sourceUnitCount ?? previewRows.length}
                  className='mt-2 h-11 w-full border border-white/14 bg-white/[0.025] px-3 text-sm text-white outline-none focus:border-[#d84a3f]'
                />
              </label>
              <label className='text-xs text-white/48'>
                标签（逗号分隔）
                <input
                  name='tags'
                  required
                  defaultValue={script.tags.join(', ')}
                  className='mt-2 h-11 w-full border border-white/14 bg-white/[0.025] px-3 text-sm text-white outline-none focus:border-[#d84a3f]'
                />
              </label>
            </div>

            <label className='mt-5 block text-xs text-white/48'>
              一句话故事
              <textarea
                name='logline'
                required
                rows={3}
                defaultValue={script.logline}
                className='mt-2 w-full resize-none border border-white/14 bg-white/[0.025] p-3 text-sm leading-6 text-white outline-none focus:border-[#d84a3f]'
              />
            </label>
            <label className='mt-5 block text-xs text-white/48'>
              导演阐述
              <textarea
                name='directorStatement'
                required
                rows={6}
                defaultValue={script.directorStatement}
                className='mt-2 w-full resize-y whitespace-pre-wrap border border-white/14 bg-white/[0.025] p-3 text-sm leading-7 text-white outline-none focus:border-[#d84a3f]'
              />
            </label>
            <label className='mt-5 block text-xs text-white/48'>
              故事梗概
              <textarea
                name='synopsis'
                required
                rows={5}
                defaultValue={script.synopsis}
                className='mt-2 w-full resize-none border border-white/14 bg-white/[0.025] p-3 text-sm leading-6 text-white outline-none focus:border-[#d84a3f]'
              />
            </label>
          </div>

          <aside>
            <FileDropTarget
              ariaLabel='更换剧本封面'
              accept={IMAGE_UPLOAD_ACCEPT}
              onSelect={(file, receivedCount) => {
                if (receivedCount > 1) toast.info('剧本封面只接收一张图片');
                void selectCover(file);
              }}
              className='border border-white/10 p-3 transition-[border-color,background-color,transform] focus-visible:border-[#d84a3f] data-[dragging=true]:scale-[0.985] data-[dragging=true]:border-[#d84a3f] data-[dragging=true]:bg-[#d84a3f]/8'
            >
              {({ dragging }) => (
                <div className='grid grid-cols-[88px_1fr] gap-4'>
                  <div className='relative aspect-[2/3] overflow-hidden bg-white/[0.03]'>
                    {coverPreparing ? (
                      <span className='grid h-full place-items-center' aria-label='正在压缩封面'>
                        <span className='size-4 animate-spin rounded-full border border-white/18 border-t-[#d84a3f]' />
                      </span>
                    ) : (
                      <Image
                        src={coverPreview ?? script.image}
                        alt={`${script.title}封面预览`}
                        fill
                        className='object-cover'
                        sizes='88px'
                      />
                    )}
                    {dragging ? (
                      <span className='absolute inset-0 grid place-items-center bg-[#0c0d10]/78 text-[10px] text-[#ec7c72]'>
                        松开上传
                      </span>
                    ) : null}
                  </div>
                  <div className='min-w-0 py-1'>
                    <p className='flex items-center justify-between gap-3 text-xs font-medium'>
                      更换剧本封面
                      <Icons.upload
                        size={13}
                        className={dragging ? 'text-[#d84a3f]' : 'text-white/24'}
                      />
                    </p>
                    <p className='mt-2 truncate text-[10px] text-white/34'>
                      {coverPreparing
                        ? '正在本地压缩…'
                        : (coverResult ?? cover?.name ?? script.format)}
                    </p>
                    <p className='mt-1 text-[10px] text-white/30'>{files.length} 份交付文件</p>
                    <p className='mt-4 text-[10px] text-[#d9685e]'>
                      {dragging
                        ? '松开鼠标即可上传'
                        : cover
                          ? '拖入新图片或点击替换'
                          : '拖入图片或点击选择'}
                    </p>
                    <p className='mt-1 text-[9px] text-white/24'>超过 12 MB 将自动压缩</p>
                  </div>
                </div>
              )}
            </FileDropTarget>

            <div className='mt-4 border border-white/10 p-5'>
              <div className='flex items-end justify-between'>
                <div>
                  <p className='text-sm font-medium'>白名单试读</p>
                  <p className='mt-1 text-[10px] text-white/30'>前台只接收已开放内容</p>
                </div>
                <strong className='font-mono text-2xl font-normal text-[#d84a3f]'>
                  {previewAmount}
                </strong>
              </div>
              {sceneBased ? (
                <div className='mt-5 grid grid-cols-2 gap-2' aria-label='试读范围'>
                  {Array.from({ length: previewMaximum }, (_, index) => index + 1).map((amount) => (
                    <button
                      key={amount}
                      type='button'
                      onClick={() => setPreviewAmount(amount)}
                      className={cn(
                        'border px-3 py-2 text-xs transition-colors',
                        previewAmount === amount
                          ? 'border-[#d84a3f] bg-[#d84a3f]/5 text-white'
                          : 'border-white/10 text-white/36 hover:border-white/24'
                      )}
                    >
                      开放前 {amount} 场
                    </button>
                  ))}
                </div>
              ) : (
                <>
                  <input
                    aria-label='试读范围'
                    type='range'
                    min='1'
                    max={previewMaximum}
                    value={previewAmount}
                    onChange={(event) => setPreviewAmount(Number(event.target.value))}
                    className='mt-5 w-full accent-[#d84a3f]'
                  />
                  <div className='mt-2 flex justify-between text-[10px] text-white/24'>
                    <span>1 段</span>
                    <span>{previewMaximum} 段</span>
                  </div>
                </>
              )}
              <label className='mt-5 block text-xs text-white/40'>
                试读结束理由
                <textarea
                  name='previewRationale'
                  rows={4}
                  defaultValue={script.previewRationale}
                  className='mt-2 w-full resize-none border border-white/12 bg-white/[0.025] p-3 text-xs leading-5 text-white/72 outline-none focus:border-[#d84a3f]'
                />
              </label>
            </div>

            <div className='mt-4 border border-white/10 p-5'>
              <p className='text-sm font-medium'>发布状态</p>
              <div className='mt-4 grid grid-cols-2 gap-2'>
                {[
                  ['draft', '草稿', '前台隐藏'],
                  ['available', '销售中', '前台可见']
                ].map(([value, label, note]) => (
                  <button
                    key={value}
                    type='button'
                    disabled={value === 'available' && previewRows.length === 0}
                    onClick={() => setStatus(value as 'draft' | 'available')}
                    className={cn(
                      'border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-30',
                      status === value
                        ? 'border-[#d84a3f] bg-[#d84a3f]/5'
                        : 'border-white/10 hover:border-white/24'
                    )}
                  >
                    <strong className='block text-xs font-medium'>{label}</strong>
                    <span className='mt-1 block text-[10px] text-white/28'>{note}</span>
                  </button>
                ))}
              </div>
              {!previewRows.length ? (
                <p className='mt-3 text-[10px] leading-5 text-[#d9685e]'>
                  当前没有填写试读内容，只能保存为草稿。
                </p>
              ) : null}
            </div>
          </aside>
        </div>

        <section className='mt-9 border-t border-white/10 pt-7'>
          <div className='flex flex-col justify-between gap-4 sm:flex-row sm:items-end'>
            <div>
              <p className='text-sm font-medium'>白名单可阅读剧本</p>
              <p className='mt-2 max-w-2xl text-xs leading-5 text-white/34'>
                这里修改的中文和英文会直接同步到详情页试读区。换行、空行和缩进会按输入原样保留。
              </p>
            </div>
            <button
              type='button'
              onClick={addPreviewRow}
              className='inline-flex h-9 items-center gap-2 border border-white/14 px-3 text-xs text-white/54 transition-colors hover:border-white/30 hover:text-white active:translate-y-px'
            >
              <Icons.add size={14} /> 添加试读单元
            </button>
          </div>

          <div className='mt-5 space-y-4'>
            {previewRows.map((row, index) => (
              <div key={row.id} className='border border-white/10 bg-white/[0.015] p-4'>
                <div className='mb-4 flex items-center justify-between'>
                  <span className='font-mono text-[10px] tracking-[0.12em] text-[#d84a3f]'>
                    PREVIEW {String(index + 1).padStart(2, '0')}
                  </span>
                  {previewRows.length > 1 ? (
                    <button
                      type='button'
                      onClick={() => removePreviewRow(row.id)}
                      className='text-white/24 transition-colors hover:text-[#d9685e]'
                      aria-label={`删除试读单元 ${index + 1}`}
                    >
                      <Icons.trash size={14} />
                    </button>
                  ) : null}
                </div>
                <div className='grid gap-4 lg:grid-cols-2'>
                  <label className='text-xs text-white/42'>
                    中文内容 · 保留逐行排版
                    <textarea
                      required
                      rows={8}
                      spellCheck={false}
                      value={row.zh}
                      onChange={(event) => updatePreviewRow(row.id, 'zh', event.target.value)}
                      className={previewEditorClass}
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
                      className={previewEditorClass}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className='mt-8 flex flex-col justify-between gap-4 border-t border-white/10 pt-5 sm:flex-row sm:items-center'>
          <p className='max-w-xl text-xs leading-5 text-white/30'>
            选择“销售中”后，白名单用户可以查看详情并购买；成交后系统立即下架并锁定该项目。
          </p>
          <div className='flex gap-3'>
            <button type='button' onClick={onClose} className='h-11 px-5 text-sm text-white/42'>
              取消
            </button>
            <button
              type='submit'
              disabled={saving || coverPreparing}
              className='h-11 bg-[#d84a3f] px-6 text-sm font-semibold text-[#130f0f] transition-colors hover:bg-[#df5b51] active:translate-y-px disabled:cursor-wait disabled:opacity-55'
            >
              {coverPreparing ? '正在压缩封面…' : saving ? '正在保存…' : '保存并同步前台'}
            </button>
          </div>
        </div>
      </form>
    </DemoModal>
  );
}

const previewEditorClass =
  'mt-2 w-full resize-y whitespace-pre-wrap border border-white/12 bg-white/[0.025] p-3 font-mono text-[13px] leading-6 text-white outline-none [tab-size:4] focus:border-[#d84a3f]';
