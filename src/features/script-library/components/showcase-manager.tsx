'use client';

import { Icons } from '@/components/icons';
import type { ShowcasePosterDto } from '@/modules/showcase/contracts';
import Image from 'next/image';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { DemoModal } from './demo-modal';

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: { message?: string };
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

function getFormError(payload: ApiEnvelope<unknown>, fallback: string) {
  return payload.error?.message ?? fallback;
}

async function fetchAdminPosters(): Promise<ShowcasePosterDto[]> {
  const response = await fetch('/api/v1/admin/showcase-posters');
  const payload = (await response.json()) as ApiEnvelope<{ items: ShowcasePosterDto[] }>;
  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(getFormError(payload, '海报列表读取失败'));
  }
  return payload.data.items;
}

export function ShowcaseManager() {
  const [posters, setPosters] = useState<ShowcasePosterDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<ShowcasePosterDto | null>(null);
  const [deleting, setDeleting] = useState<ShowcasePosterDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [sorting, setSorting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const loadPosters = async () => {
    try {
      setPosters(await fetchAdminPosters());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : '海报列表读取失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetchAdminPosters()
      .then((items) => {
        if (active) setPosters(items);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : '海报列表读取失败');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const openCreate = () => {
    setEditing(null);
    setImagePreview(null);
    setEditorOpen(true);
  };

  const openEdit = (poster: ShowcasePosterDto) => {
    setEditing(poster);
    setImagePreview(null);
    setEditorOpen(true);
  };

  const savePoster = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    const formData = new FormData(event.currentTarget);
    const image = formData.get('image');
    if (!editing && (!(image instanceof File) || image.size === 0)) {
      toast.error('请选择一张海报图片');
      setSaving(false);
      return;
    }

    try {
      const response = await fetch(
        editing ? `/api/v1/admin/showcase-posters/${editing.id}` : '/api/v1/admin/showcase-posters',
        { method: editing ? 'PATCH' : 'POST', body: formData }
      );
      const payload = (await response.json()) as ApiEnvelope<{ poster: ShowcasePosterDto }>;
      if (!response.ok || !payload.success || !payload.data) {
        toast.error(getFormError(payload, '海报保存失败'));
        return;
      }

      setPosters((items) =>
        editing
          ? items.map((item) => (item.id === payload.data!.poster.id ? payload.data!.poster : item))
          : [...items, payload.data!.poster]
      );
      setEditorOpen(false);
      setEditing(null);
      setImagePreview(null);
      toast.success(editing ? '海报已更新' : '海报已上传');
    } catch {
      toast.error('当前无法连接海报服务');
    } finally {
      setSaving(false);
    }
  };

  const movePoster = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= posters.length || sorting) return;
    const reordered = [...posters];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setPosters(reordered);
    setSorting(true);

    try {
      const response = await fetch('/api/v1/admin/showcase-posters', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: reordered.map((item) => item.id) })
      });
      const payload = (await response.json()) as ApiEnvelope<unknown>;
      if (!response.ok || !payload.success) throw new Error(getFormError(payload, '排序保存失败'));
      toast.success('展示顺序已更新');
    } catch (error) {
      setPosters(posters);
      toast.error(error instanceof Error ? error.message : '排序保存失败');
    } finally {
      setSorting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      const response = await fetch(`/api/v1/admin/showcase-posters/${deleting.id}`, {
        method: 'DELETE'
      });
      const payload = (await response.json()) as ApiEnvelope<unknown>;
      if (!response.ok || !payload.success) {
        toast.error(getFormError(payload, '海报删除失败'));
        return;
      }
      setPosters((items) => items.filter((item) => item.id !== deleting.id));
      setDeleting(null);
      toast.success('海报已删除，门户已同步');
    } catch {
      toast.error('当前无法连接海报服务');
    }
  };

  return (
    <>
      <div className='mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end'>
        <div>
          <p className='text-[10px] tracking-[0.2em] text-[#d84a3f] uppercase'>Portal showcase</p>
          <h2 className='mt-2 font-serif text-4xl tracking-[-0.04em]'>首页滚动海报</h2>
          <p className='mt-3 max-w-2xl text-xs leading-6 text-white/38'>
            这里的发布状态与顺序会直接同步到门户首页。上传图片会统一转为
            WebP，并通过可替换的存储接口保存。
          </p>
        </div>
        <button
          type='button'
          onClick={openCreate}
          className='inline-flex h-10 items-center justify-center gap-2 bg-[#d84a3f] px-4 text-sm font-semibold whitespace-nowrap text-[#130f0f] active:translate-y-px'
        >
          <Icons.add size={16} /> 上传海报
        </button>
      </div>

      {loading ? (
        <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3' aria-label='正在读取海报'>
          {[0, 1, 2].map((item) => (
            <div key={item} className='aspect-[3/4] animate-pulse bg-white/[0.035]' />
          ))}
        </div>
      ) : loadError ? (
        <div className='border border-[#d84a3f]/35 bg-[#d84a3f]/5 px-6 py-12 text-center'>
          <Icons.warning className='mx-auto text-[#d84a3f]' size={22} />
          <p className='mt-4 text-sm text-white/72'>{loadError}</p>
          <p className='mt-2 text-xs text-white/34'>请确认数据库和本地文件目录已经完成初始化。</p>
          <button
            type='button'
            onClick={() => {
              setLoading(true);
              setLoadError(null);
              void loadPosters();
            }}
            className='mt-6 border border-white/14 px-4 py-2 text-xs text-white/64 hover:border-white/30'
          >
            重新读取
          </button>
        </div>
      ) : posters.length ? (
        <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'>
          {posters.map((poster, index) => (
            <article key={poster.id} className='group border border-white/10 bg-white/[0.02]'>
              <div className='relative aspect-[3/4] overflow-hidden bg-white/5'>
                <Image
                  src={poster.imageUrl}
                  alt={`${poster.title}海报`}
                  fill
                  unoptimized
                  sizes='(max-width: 768px) 50vw, 25vw'
                  className='object-cover transition-transform duration-500 group-hover:scale-[1.02]'
                />
                <div className='absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent p-5 pt-16'>
                  <p className='font-serif text-2xl tracking-[-0.03em]'>{poster.title}</p>
                  {poster.subtitle ? (
                    <p className='mt-1 line-clamp-2 text-xs leading-5 text-white/52'>
                      {poster.subtitle}
                    </p>
                  ) : null}
                </div>
                <span
                  className={`absolute top-3 left-3 px-2.5 py-1 text-[10px] ${
                    poster.published
                      ? 'bg-emerald-400 text-[#07120d]'
                      : 'border border-white/20 bg-black/55 text-white/62 backdrop-blur-md'
                  }`}
                >
                  {poster.published ? '展示中' : '未发布'}
                </span>
                <span className='absolute top-3 right-3 bg-black/60 px-2 py-1 font-mono text-[10px] text-white/54 backdrop-blur-md'>
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>
              <div className='p-4'>
                <div className='flex items-center justify-between gap-3 text-[10px] text-white/30'>
                  <span>{poster.linkHref ? '已设置跳转' : '仅展示'}</span>
                  <span>{formatDate(poster.updatedAt)}</span>
                </div>
                <div className='mt-4 flex items-center justify-between border-t border-white/8 pt-4'>
                  <div className='flex gap-1'>
                    <button
                      type='button'
                      onClick={() => void movePoster(index, -1)}
                      disabled={index === 0 || sorting}
                      aria-label={`上移${poster.title}`}
                      className='grid size-8 place-items-center border border-white/10 text-white/42 hover:text-white disabled:cursor-not-allowed disabled:opacity-20'
                    >
                      <Icons.chevronLeft size={15} />
                    </button>
                    <button
                      type='button'
                      onClick={() => void movePoster(index, 1)}
                      disabled={index === posters.length - 1 || sorting}
                      aria-label={`下移${poster.title}`}
                      className='grid size-8 place-items-center border border-white/10 text-white/42 hover:text-white disabled:cursor-not-allowed disabled:opacity-20'
                    >
                      <Icons.chevronRight size={15} />
                    </button>
                  </div>
                  <div className='flex items-center gap-4'>
                    <button
                      type='button'
                      onClick={() => openEdit(poster)}
                      className='inline-flex items-center gap-1 text-xs text-[#df675c] hover:text-[#ec7c72]'
                    >
                      <Icons.edit size={13} /> 编辑
                    </button>
                    <button
                      type='button'
                      onClick={() => setDeleting(poster)}
                      className='inline-flex items-center gap-1 text-xs text-white/28 hover:text-[#df675c]'
                    >
                      <Icons.trash size={13} /> 删除
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className='border border-dashed border-white/14 px-6 py-20 text-center'>
          <Icons.media className='mx-auto text-white/24' size={28} />
          <p className='mt-5 font-serif text-2xl'>还没有首页海报</p>
          <p className='mt-2 text-xs text-white/34'>
            上传第一张图片，并设为发布后就会出现在门户滚动区。
          </p>
          <button
            type='button'
            onClick={openCreate}
            className='mt-6 bg-[#d84a3f] px-5 py-3 text-sm font-semibold text-[#130f0f]'
          >
            上传第一张
          </button>
        </div>
      )}

      <DemoModal
        open={editorOpen}
        onClose={() => {
          if (!saving) setEditorOpen(false);
        }}
        title={editing ? '编辑首页海报' : '上传首页海报'}
        eyebrow='Portal poster'
      >
        <form onSubmit={savePoster} className='space-y-5'>
          <div>
            <label htmlFor='poster-image' className='block text-xs text-white/56'>
              海报图片{editing ? '（不选择则保留原图）' : ''}
            </label>
            <label
              htmlFor='poster-image'
              className='mt-2 grid min-h-44 cursor-pointer place-items-center overflow-hidden border border-dashed border-white/18 bg-white/[0.025] transition-colors hover:border-[#d84a3f]/70'
            >
              {imagePreview || editing ? (
                <span className='relative block h-56 w-full'>
                  <Image
                    src={imagePreview ?? editing!.imageUrl}
                    alt='海报预览'
                    fill
                    unoptimized
                    sizes='560px'
                    className='object-cover'
                  />
                  <span className='absolute inset-0 grid place-items-center bg-black/45 text-xs opacity-0 transition-opacity hover:opacity-100'>
                    点击更换图片
                  </span>
                </span>
              ) : (
                <span className='text-center'>
                  <Icons.upload className='mx-auto text-[#d84a3f]' size={22} />
                  <span className='mt-3 block text-sm text-white/64'>选择海报图片</span>
                  <span className='mt-1 block text-[10px] text-white/28'>
                    JPG / PNG / WebP / AVIF，最大 12 MB
                  </span>
                </span>
              )}
            </label>
            <input
              id='poster-image'
              name='image'
              type='file'
              accept='image/jpeg,image/png,image/webp,image/avif'
              className='sr-only'
              onChange={(event) => {
                const file = event.target.files?.[0];
                setImagePreview(file ? URL.createObjectURL(file) : null);
              }}
            />
          </div>

          <div>
            <label htmlFor='poster-title' className='block text-xs text-white/56'>
              标题
            </label>
            <input
              id='poster-title'
              name='title'
              required
              maxLength={80}
              defaultValue={editing?.title ?? ''}
              className='mt-2 h-11 w-full border border-white/12 bg-white/[0.025] px-3 text-sm outline-none placeholder:text-white/24 focus:border-[#d84a3f]'
              placeholder='例如：镜中裁决'
            />
          </div>
          <div>
            <label htmlFor='poster-subtitle' className='block text-xs text-white/56'>
              简短说明
            </label>
            <input
              id='poster-subtitle'
              name='subtitle'
              maxLength={140}
              defaultValue={editing?.subtitle ?? ''}
              className='mt-2 h-11 w-full border border-white/12 bg-white/[0.025] px-3 text-sm outline-none placeholder:text-white/24 focus:border-[#d84a3f]'
              placeholder='题材、作品类型或一句话介绍'
            />
          </div>
          <div>
            <label htmlFor='poster-link-type' className='block text-xs text-white/56'>
              点击行为
            </label>
            <select
              id='poster-link-type'
              name='linkType'
              defaultValue={editing?.linkType ?? 'none'}
              className='mt-2 h-11 w-full border border-white/12 bg-[#15161a] px-3 text-sm outline-none focus:border-[#d84a3f]'
              onChange={(event) => {
                const field = event.currentTarget.form?.elements.namedItem('externalUrl');
                if (field instanceof HTMLInputElement) {
                  field.disabled = event.target.value !== 'external';
                }
              }}
            >
              <option value='none'>仅展示，不跳转</option>
              <option value='external'>跳转到指定网页</option>
              {editing?.linkType === 'script' ? (
                <option value='script'>保留当前剧本关联</option>
              ) : null}
            </select>
            {editing?.linkedScriptId ? (
              <input type='hidden' name='linkedScriptId' value={editing.linkedScriptId} />
            ) : null}
            <p className='mt-2 text-[10px] leading-5 text-white/28'>
              剧本详情关联将在剧本数据正式接入后自动加入这里。
            </p>
          </div>
          <div>
            <label htmlFor='poster-external-url' className='block text-xs text-white/56'>
              跳转地址
            </label>
            <input
              id='poster-external-url'
              name='externalUrl'
              type='url'
              disabled={!editing || editing.linkType !== 'external'}
              defaultValue={editing?.externalUrl ?? ''}
              className='mt-2 h-11 w-full border border-white/12 bg-white/[0.025] px-3 text-sm outline-none placeholder:text-white/24 disabled:cursor-not-allowed disabled:opacity-35 focus:border-[#d84a3f]'
              placeholder='https://example.com/project'
            />
          </div>
          <div className='flex items-start gap-3 border-y border-white/10 py-4'>
            <input
              id='poster-published'
              name='published'
              type='checkbox'
              value='true'
              defaultChecked={editing?.published ?? true}
              className='mt-0.5 size-4 accent-[#d84a3f]'
            />
            <label htmlFor='poster-published' className='cursor-pointer'>
              <span className='block text-sm text-white/72'>立即在门户展示</span>
              <span className='mt-1 block text-[10px] leading-5 text-white/30'>
                关闭后海报仍保存在后台，但访客不会看到。
              </span>
            </label>
          </div>
          <div className='flex gap-3 pt-1'>
            <button
              type='button'
              onClick={() => setEditorOpen(false)}
              disabled={saving}
              className='h-11 flex-1 border border-white/14 text-sm text-white/62 disabled:opacity-40'
            >
              取消
            </button>
            <button
              type='submit'
              disabled={saving}
              className='h-11 flex-1 bg-[#d84a3f] text-sm font-semibold text-[#130f0f] disabled:cursor-wait disabled:opacity-55'
            >
              {saving ? '正在保存…' : editing ? '保存修改' : '上传并保存'}
            </button>
          </div>
        </form>
      </DemoModal>

      <DemoModal
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={deleting ? `删除《${deleting.title}》海报` : '删除海报'}
        eyebrow='Delete poster'
      >
        <div className='border-l-2 border-[#d84a3f] bg-[#d84a3f]/5 p-5'>
          <p className='flex items-center gap-2 text-sm text-white/78'>
            <Icons.warning size={17} className='text-[#d84a3f]' /> 确认删除这张海报？
          </p>
          <p className='mt-3 text-xs leading-6 text-white/38'>
            删除后门户会立即停止展示，同时移除本地图片文件。此操作不能撤销。
          </p>
        </div>
        <div className='mt-6 flex gap-3'>
          <button
            type='button'
            onClick={() => setDeleting(null)}
            className='h-11 flex-1 border border-white/14 text-sm text-white/62'
          >
            保留海报
          </button>
          <button
            type='button'
            onClick={() => void confirmDelete()}
            className='h-11 flex-1 bg-[#d84a3f] text-sm font-semibold text-[#130f0f]'
          >
            确认删除
          </button>
        </div>
      </DemoModal>
    </>
  );
}
