'use client';

import { Icons } from '@/components/icons';
import type { DemoScript } from '@/features/script-library/api/types';
import { DemoModal } from '@/features/script-library/components/demo-modal';
import { useScriptLibraryDemo } from '@/features/script-library/components/demo-context';
import { LibraryHeader } from '@/features/script-library/components/library-header';
import { HeartPointAmount } from '@/features/script-library/components/heart-point-mark';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type ReaderMode = 'bilingual' | 'en' | 'zh';

interface DeliveryFile {
  number: string;
  kind: 'script' | 'bilingual' | 'chinese' | 'director-statement';
  label: string;
  detail: string;
  filename: string;
}

const readerModes: { id: ReaderMode; label: string }[] = [
  { id: 'bilingual', label: '中英对照' },
  { id: 'en', label: '仅英文' },
  { id: 'zh', label: '仅中文' }
];

function getDeliveryFiles(script: DemoScript): DeliveryFile[] {
  const parallelProduction =
    script.packageMode === 'parallel-production' || Boolean(script.deliverables.chinese);

  return [
    {
      number: '01',
      kind: 'script',
      label: parallelProduction ? '英文制作稿' : '英文剧本',
      detail: parallelProduction ? '保留完整制作标记的英文原稿' : '纯英文成片剧本',
      filename: script.deliverables.script
    },
    {
      number: '02',
      kind: parallelProduction ? 'chinese' : 'bilingual',
      label: parallelProduction ? '中文制作稿' : '中英对照剧本',
      detail: parallelProduction ? '与英文稿按集号、场号对应' : '英文与中文逐条对应',
      filename: parallelProduction
        ? (script.deliverables.chinese ?? '')
        : (script.deliverables.bilingual ?? '')
    },
    {
      number: '03',
      kind: 'director-statement',
      label: '导演阐述',
      detail: '创作、人物与视觉执行标准',
      filename: script.deliverables.directorStatement
    }
  ];
}

function LockedDetail({ script, unavailable }: { script: DemoScript; unavailable: boolean }) {
  return (
    <main className='min-h-screen bg-[#0c0d10] text-[#f4f0e8]'>
      <LibraryHeader />
      <section className='relative isolate min-h-[calc(100dvh-4rem)] overflow-hidden'>
        <Image
          src={script.image}
          alt=''
          fill
          className='-z-20 object-cover opacity-20 blur-2xl'
          sizes='100vw'
        />
        <div className='absolute inset-0 -z-10 bg-[radial-gradient(circle_at_72%_32%,rgba(216,74,63,.15),transparent_33%),linear-gradient(90deg,#0c0d10_18%,rgba(12,13,16,.76),#0c0d10)]' />
        <div className='mx-auto grid min-h-[calc(100dvh-4rem)] max-w-[1360px] items-center gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-12'>
          <div className='max-w-3xl'>
            <Link
              href='/scripts'
              className='mb-10 inline-flex items-center gap-2 text-sm text-white/42 transition-colors hover:text-white'
            >
              <Icons.chevronLeft size={16} /> 返回剧本库
            </Link>
            <p className='text-[11px] tracking-[0.24em] text-[#d84a3f] uppercase'>
              {unavailable ? 'Exclusive rights sold' : 'Whitelist access required'}
            </p>
            <h1 className='mt-5 text-balance font-serif text-[clamp(4.4rem,9vw,8.6rem)] leading-[0.82] tracking-[-0.07em]'>
              {script.title}
            </h1>
            <p className='mt-5 text-xs tracking-[0.14em] text-white/34 uppercase'>
              {script.englishTitle}
            </p>
            <p className='mt-9 max-w-2xl text-lg leading-8 text-white/64'>{script.logline}</p>
            <div className='mt-10 flex flex-wrap gap-2'>
              {script.tags.map((tag) => (
                <span
                  key={tag}
                  className='border border-white/12 px-3 py-1.5 text-xs text-white/42'
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <aside className='border-t border-white/14 pt-7 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-9'>
            <span className='grid size-11 place-items-center border border-[#d84a3f]/50 text-[#d84a3f]'>
              <Icons.lock size={18} />
            </span>
            <h2 className='mt-6 font-serif text-3xl tracking-[-0.035em]'>
              {unavailable ? '独家授权已成交' : '内容仅对白名单开放'}
            </h2>
            <p className='mt-4 text-sm leading-7 text-white/44'>
              {unavailable
                ? '该剧本已经售出，其他用户不能查看导演阐述、试读内容或重新购买。'
                : '登录白名单账号后，可以阅读完整导演阐述和经过截取的中英对照试读。'}
            </p>
            {!unavailable ? (
              <Link
                href='/login'
                className='mt-7 inline-flex h-11 items-center gap-2 bg-[#d84a3f] px-5 text-sm font-semibold text-[#130f0f] transition-transform active:translate-y-px'
              >
                登录 / 注册 <Icons.arrowRight size={16} />
              </Link>
            ) : null}
          </aside>
        </div>
      </section>
    </main>
  );
}

function DeliveryManifest({ script, purchased }: { script: DemoScript; purchased: boolean }) {
  const files = getDeliveryFiles(script);

  return (
    <section id='deliverables' className='scroll-mt-36 border-t border-white/10 pt-12'>
      <div className='grid gap-7 md:grid-cols-[0.42fr_1fr]'>
        <div>
          <h2 className='font-serif text-4xl leading-none tracking-[-0.045em]'>标准交付包</h2>
          <p className='mt-5 max-w-xs text-sm leading-6 text-white/38'>
            三份独立原始文件，购买前仅展示文件类型，不提供完整内容。
          </p>
        </div>
        <div className='border-t border-white/14'>
          {files.map((file) => (
            <div
              key={file.number}
              className='grid grid-cols-[38px_1fr_auto] items-center gap-3 border-b border-white/10 py-5 sm:grid-cols-[56px_180px_1fr_auto]'
            >
              <span className='font-mono text-[10px] text-[#d84a3f]'>{file.number}</span>
              <div>
                <p className='text-sm font-medium'>{file.label}</p>
                <p className='mt-1 text-xs text-white/30 sm:hidden'>{file.detail}</p>
              </div>
              <p className='hidden text-xs text-white/34 sm:block'>
                {purchased ? file.filename : file.detail}
              </p>
              {purchased ? (
                <a
                  href={`/api/v1/scripts/${script.id}/files/${file.kind}`}
                  className='grid size-9 place-items-center border border-white/12 text-white/44 transition-colors hover:border-[#d84a3f] hover:text-[#d84a3f]'
                  aria-label={`下载${file.label}`}
                >
                  <Icons.download size={14} />
                </a>
              ) : (
                <Icons.lock className='text-white/22' size={14} />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ScriptDetail() {
  const params = useParams<{ id: string }>();
  const {
    role,
    authPending,
    currentUser,
    scripts,
    scriptsLoading,
    purchasedIds,
    purchaseScript,
    loadScript
  } = useScriptLibraryDemo();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [readerMode, setReaderMode] = useState<ReaderMode>('bilingual');
  const [directorSectionId, setDirectorSectionId] = useState('concept');
  const [loadedScript, setLoadedScript] = useState<DemoScript | null>(null);
  const [detailAttempted, setDetailAttempted] = useState(false);

  const summaryScript = scripts.find((item) => item.id === params.id);

  useEffect(() => {
    if (authPending || role === 'guest' || !summaryScript || summaryScript.detailLoaded) return;
    let active = true;
    loadScript(params.id).then((result) => {
      if (!active) return;
      setLoadedScript(result);
      setDetailAttempted(true);
    });
    return () => {
      active = false;
    };
  }, [authPending, loadScript, params.id, role, summaryScript]);

  if (
    authPending ||
    scriptsLoading ||
    (role !== 'guest' && summaryScript && !summaryScript.detailLoaded && !detailAttempted)
  ) {
    return <main className='min-h-screen bg-[#0c0d10]' />;
  }

  const script = loadedScript ?? summaryScript;

  if (!script)
    return (
      <main className='grid min-h-screen place-items-center bg-[#0c0d10] px-5 text-center text-[#f4f0e8]'>
        <div>
          <p className='font-serif text-5xl'>剧本不存在</p>
          <Link href='/scripts' className='mt-6 inline-flex text-sm text-[#d9685e]'>
            返回剧本库
          </Link>
        </div>
      </main>
    );

  const purchased = purchasedIds.includes(script.id);
  const unavailable = script.status === 'sold' && role !== 'admin' && !purchased;
  if (role === 'guest' || unavailable)
    return <LockedDetail script={script} unavailable={unavailable} />;

  const finalPrice = script.price;
  const deliveryFiles = getDeliveryFiles(script);
  const parallelProduction =
    script.packageMode === 'parallel-production' || Boolean(script.deliverables.chinese);
  const previewSourceTotal = script.sourceUnitCount ?? script.sourcePairCount;
  const visiblePreviewCount = script.previewSceneBreaks?.length
    ? (script.previewSceneBreaks[(script.previewUnitCount ?? 1) - 1] ?? script.preview.length)
    : (script.previewVisibleCount ?? script.preview.length);
  const visiblePreview = script.preview.slice(0, visiblePreviewCount);
  const previewOpenCount = script.previewUnitCount ?? visiblePreview.length;
  const previewUnitLabel = script.previewUnitLabel ?? '段';
  const activeDirectorSection =
    script.directorSections?.find((section) => section.id === directorSectionId) ??
    script.directorSections?.[0];
  const handlePurchase = async () => {
    setPurchasing(true);
    const result = await purchaseScript(script.id);
    setPurchasing(false);
    if (result.ok) {
      setConfirmOpen(false);
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  return (
    <main className='min-h-screen bg-[#0c0d10] text-[#f4f0e8]'>
      <LibraryHeader />
      <section className='relative isolate overflow-hidden border-b border-white/10'>
        <Image
          src={script.image}
          alt=''
          fill
          className='-z-30 scale-110 object-cover opacity-24 blur-2xl'
          sizes='100vw'
        />
        <div className='absolute inset-0 -z-20 bg-[radial-gradient(circle_at_76%_22%,rgba(216,74,63,.18),transparent_28%),linear-gradient(90deg,#0c0d10_15%,rgba(12,13,16,.78)_62%,#0c0d10)]' />
        <div className='absolute inset-0 -z-10 opacity-[0.025] [background-image:repeating-linear-gradient(0deg,transparent,transparent_3px,#fff_4px)]' />
        <div className='mx-auto max-w-[1440px] px-5 pt-8 pb-14 sm:px-8 lg:px-12 lg:pt-12 lg:pb-20'>
          <Link
            href='/scripts'
            className='inline-flex items-center gap-2 text-sm text-white/42 transition-colors hover:text-white'
          >
            <Icons.chevronLeft size={16} /> 返回剧本库
          </Link>
          <div className='mt-10 grid items-end gap-10 lg:grid-cols-[210px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)]'>
            <div className='relative aspect-[3/4.2] w-full max-w-[250px] overflow-hidden shadow-[0_28px_80px_rgba(0,0,0,.44)]'>
              <Image
                src={script.image}
                alt={`${script.title}封面`}
                fill
                priority
                className='object-cover'
                sizes='250px'
              />
            </div>
            <div className='pb-1'>
              <div className='flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] tracking-[0.17em] uppercase'>
                <span className='text-[#d9685e]'>{script.genre}</span>
                <span className='text-white/46'>{script.presentationMode}</span>
                <span className='text-white/28'>独家版权 · 一次成交</span>
              </div>
              <h1 className='mt-5 max-w-5xl text-balance font-serif text-[clamp(4rem,8vw,8.2rem)] leading-[0.82] tracking-[-0.07em]'>
                {script.title}
              </h1>
              <div className='mt-6 flex flex-col gap-6 border-t border-white/14 pt-5 sm:flex-row sm:items-end sm:justify-between'>
                <div>
                  <p className='text-xs tracking-[0.14em] text-white/32 uppercase'>
                    {script.englishTitle}
                  </p>
                  <p className='mt-4 max-w-2xl text-lg leading-8 text-white/68'>{script.logline}</p>
                </div>
                <div className='flex shrink-0 gap-7 text-xs text-white/38'>
                  <span>
                    <strong className='mb-1 block font-mono text-lg font-normal text-white/78'>
                      {script.episodes || '待定'}
                    </strong>
                    集数
                  </span>
                  <span>
                    <strong className='mb-1 block font-mono text-lg font-normal text-white/78'>
                      03
                    </strong>
                    交付文件
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <nav
        className='sticky top-16 z-30 border-b border-white/10 bg-[#0c0d10]/92 backdrop-blur-xl'
        aria-label='剧本详情章节'
      >
        <div className='mx-auto flex max-w-[1440px] items-center gap-6 overflow-x-auto px-5 sm:px-8 lg:px-12'>
          {[
            ['#overview', '项目概览'],
            ['#director', '导演阐述'],
            ['#sample', '中英试读'],
            ['#deliverables', '交付内容']
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className='whitespace-nowrap border-b border-transparent py-4 text-xs text-white/42 transition-colors hover:border-[#d84a3f] hover:text-white'
            >
              {label}
            </a>
          ))}
          <span className='ml-auto hidden whitespace-nowrap text-[10px] tracking-[0.14em] text-white/22 uppercase lg:block'>
            Project dossier / {script.id}
          </span>
        </div>
      </nav>

      <div className='mx-auto grid max-w-[1440px] gap-14 px-5 py-14 sm:px-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-12 lg:py-20 xl:gap-20'>
        <article className='min-w-0 space-y-20'>
          <section id='overview' className='scroll-mt-36'>
            <div className='grid gap-8 md:grid-cols-[0.36fr_1fr]'>
              <div>
                <h2 className='font-serif text-4xl tracking-[-0.045em]'>项目概览</h2>
              </div>
              <div>
                <h3 className='font-serif text-2xl tracking-[-0.03em] text-white/88'>故事梗概</h3>
                <p className='mt-5 max-w-3xl break-words whitespace-pre-wrap text-[15px] leading-8 text-white/56 [tab-size:4]'>
                  {script.synopsis}
                </p>
                <dl className='mt-10 grid grid-cols-2 border-y border-white/10 sm:grid-cols-4'>
                  {[
                    ['题材', script.genre],
                    ['集数', script.episodes ? `${script.episodes} 集` : '待定'],
                    ['文本', script.format],
                    ['状态', script.status === 'sold' ? '已售出' : '独家在售']
                  ].map(([term, value]) => (
                    <div
                      key={term}
                      className='border-b border-white/8 py-5 even:pl-5 sm:border-r sm:border-b-0 sm:px-5 sm:first:pl-0 sm:last:border-r-0'
                    >
                      <dt className='text-[10px] text-white/28'>{term}</dt>
                      <dd className='mt-2 text-sm text-white/68'>{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </section>

          <section id='director' className='scroll-mt-36 bg-[#14161b] text-[#f4f0e8]'>
            <div className='grid md:grid-cols-[0.36fr_1fr]'>
              <div className='border-b border-white/10 p-7 md:border-r md:border-b-0 md:p-9'>
                <h2 className='mt-3 font-serif text-4xl leading-none tracking-[-0.045em]'>
                  导演阐述
                </h2>
                <p className='mt-6 text-xs leading-6 text-white/38'>
                  创作意图、人物关系、世界观与视觉执行标准在同一份独立文档中维护。
                </p>
              </div>
              <div className='p-7 md:p-10 lg:p-12'>
                <p className='max-w-3xl break-words whitespace-pre-wrap text-[15px] leading-8 text-white/62 [tab-size:4]'>
                  {script.directorStatement}
                </p>
                <div className='mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-white/10 pt-5 text-xs text-white/34'>
                  {script.tags.map((tag) => (
                    <span key={tag}>#{tag}</span>
                  ))}
                </div>
              </div>
            </div>
            {script.directorSections?.length && activeDirectorSection ? (
              <div className='grid border-t border-white/10 md:grid-cols-[0.36fr_1fr]'>
                <div
                  className='flex overflow-x-auto border-b border-white/10 p-3 md:flex-col md:border-r md:border-b-0 md:p-5'
                  role='tablist'
                  aria-label='导演阐述章节'
                >
                  {script.directorSections.map((section) => (
                    <button
                      key={section.id}
                      type='button'
                      role='tab'
                      aria-selected={directorSectionId === section.id}
                      onClick={() => setDirectorSectionId(section.id)}
                      className={cn(
                        'whitespace-nowrap border-l-2 px-4 py-3 text-left text-sm transition-colors',
                        directorSectionId === section.id
                          ? 'border-[#d84a3f] bg-white/5 text-white'
                          : 'border-transparent text-white/36 hover:text-white/70'
                      )}
                    >
                      {section.title}
                    </button>
                  ))}
                </div>
                <div className='min-h-48 p-7 md:p-10'>
                  <p className='text-xs text-[#d9685e]'>导演阐述节选</p>
                  <h3 className='mt-3 font-serif text-3xl tracking-[-0.035em]'>
                    {activeDirectorSection.title}
                  </h3>
                  <p className='mt-5 max-w-3xl break-words whitespace-pre-wrap text-[15px] leading-8 text-white/56 [tab-size:4]'>
                    {activeDirectorSection.summary}
                  </p>
                </div>
              </div>
            ) : null}
          </section>

          <section id='sample' className='scroll-mt-36'>
            <div className='flex flex-col justify-between gap-6 sm:flex-row sm:items-end'>
              <div>
                <h2 className='mt-3 font-serif text-4xl tracking-[-0.045em]'>中英对照试读</h2>
                <p className='mt-4 max-w-xl text-sm leading-6 text-white/38'>
                  {parallelProduction
                    ? '试读由上传者根据中文、英文制作稿整理并单独填写；完整正文不会进入当前页面。'
                    : '试读由上传者从中英对照文件中选取并单独填写；完整正文不会进入当前页面。'}
                </p>
                {previewSourceTotal ? (
                  <div className='mt-5 max-w-2xl border-l-2 border-[#d84a3f] pl-4'>
                    <p className='text-xs text-white/62'>
                      已开放 {previewOpenCount} / {previewSourceTotal} {previewUnitLabel}，约占全文{' '}
                      {((previewOpenCount / previewSourceTotal) * 100).toFixed(1)}%
                    </p>
                    <p className='mt-2 text-xs leading-5 text-white/32'>
                      {script.previewRationale}
                    </p>
                  </div>
                ) : null}
              </div>
              <div className='flex border border-white/10 p-1'>
                {readerModes.map((mode) => (
                  <button
                    key={mode.id}
                    type='button'
                    onClick={() => setReaderMode(mode.id)}
                    className={cn(
                      'px-3 py-2 text-xs transition-colors',
                      readerMode === mode.id
                        ? 'bg-[#d84a3f] text-[#130f0f]'
                        : 'text-white/38 hover:text-white'
                    )}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
            <div className='relative mt-8 overflow-hidden border border-white/10 bg-[#15171b] text-[#f4f0e8] shadow-[0_28px_80px_rgba(0,0,0,.22)] select-none'>
              <div className='flex items-center justify-between border-b border-white/10 px-6 py-4 text-[10px] tracking-[0.15em] text-white/32 uppercase sm:px-9'>
                <span>Preview copy / {script.englishTitle}</span>
                <span>仅供评估</span>
              </div>
              <div className='pointer-events-none absolute inset-0 z-10 grid place-items-center overflow-hidden opacity-[0.045]'>
                <span className='rotate-[-20deg] text-6xl font-semibold tracking-[0.12em] whitespace-nowrap'>
                  新梦剧本库 · 白名单试读
                </span>
              </div>
              <div className='relative px-6 py-4 sm:px-9 sm:py-7'>
                {visiblePreview.length ? (
                  visiblePreview.map((line, index) => (
                    <div
                      key={`${line.zh}-${index}`}
                      className='border-b border-white/10 py-7 last:border-b-0'
                    >
                      {readerMode !== 'zh' ? (
                        <div className='grid gap-3 sm:grid-cols-[42px_1fr]'>
                          <span className='font-mono text-[10px] text-[#d9685e]'>
                            EN {String(index + 1).padStart(2, '0')}
                          </span>
                          <p className='max-w-3xl break-words whitespace-pre-wrap font-serif text-lg leading-[1.9] [tab-size:4]'>
                            {line.en}
                          </p>
                        </div>
                      ) : null}
                      {readerMode !== 'en' ? (
                        <div
                          className={cn(
                            'grid gap-3 sm:grid-cols-[42px_1fr]',
                            readerMode === 'bilingual' && 'mt-5'
                          )}
                        >
                          <span className='font-mono text-[10px] text-white/30'>
                            ZH {String(index + 1).padStart(2, '0')}
                          </span>
                          <p className='max-w-3xl break-words whitespace-pre-wrap text-[15px] leading-[2] text-white/60 [tab-size:4]'>
                            {line.zh}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className='py-20 text-center text-sm text-white/38'>
                    该草稿尚未设置试读范围
                  </div>
                )}
              </div>
              <div className='border-t border-white/10 px-6 py-5 text-center text-xs text-white/30'>
                试读到此结束，购买后获取三份原始文件
              </div>
            </div>
          </section>
          <DeliveryManifest script={script} purchased={purchased} />
        </article>

        <aside className='lg:sticky lg:top-36 lg:self-start'>
          <div className='border-t border-[#d84a3f] bg-white/[0.025] p-6'>
            {purchased ? (
              <>
                <p className='flex items-center gap-2 text-sm text-[#76c69a]'>
                  <Icons.circleCheck size={17} /> 已完成独家购买
                </p>
                <h2 className='mt-5 font-serif text-3xl tracking-[-0.035em]'>项目资产已解锁</h2>
                <p className='mt-3 text-sm leading-6 text-white/42'>
                  英文稿、中文或中英稿、导演阐述已经整理为一个完整交付包。
                </p>
                <a
                  href={`/api/v1/scripts/${script.id}/files/all`}
                  className='mt-6 flex h-12 items-center justify-center gap-2 bg-[#d84a3f] text-sm font-semibold whitespace-nowrap text-[#130f0f] transition-colors hover:bg-[#df5b51] active:translate-y-px'
                >
                  <Icons.download size={17} /> 下载全部交付物料
                </a>
                <a
                  href='#deliverables'
                  className='mt-4 block text-center text-xs text-white/34 transition-colors hover:text-white'
                >
                  也可以单独下载文件
                </a>
              </>
            ) : role === 'admin' ? (
              <>
                <p className='text-xs text-[#d84a3f]'>管理员预览</p>
                <h2 className='mt-5 font-serif text-3xl'>
                  {script.status === 'sold' ? '项目已售出' : '项目正在销售'}
                </h2>
                <p className='mt-3 text-sm leading-6 text-white/42'>
                  当前页面展示白名单用户能够看到的内容结构。
                </p>
                <Link
                  href='/admin'
                  className='mt-6 flex h-11 items-center justify-center border border-white/14 text-sm transition-colors hover:border-white/32'
                >
                  返回管理后台
                </Link>
              </>
            ) : (
              <>
                <div className='flex items-center justify-between'>
                  <p className='text-xs text-white/34'>独家购买</p>
                  <span className='border border-white/12 px-2 py-1 text-[10px] text-white/36'>
                    仅售 1 份
                  </span>
                </div>
                <div className='h-5' />
                <HeartPointAmount
                  amount={finalPrice}
                  size='md'
                  className='font-serif text-5xl tracking-[-0.04em]'
                  nameClassName='font-sans text-sm tracking-normal text-white/36'
                />
                <p className='mt-2 text-xs text-white/30'>所有用户统一扣费</p>
                <div className='mt-7 border-y border-white/10 py-5 text-xs leading-6 text-white/40'>
                  <p className='flex items-center justify-between'>
                    <span>当前余额</span>
                    <HeartPointAmount
                      amount={currentUser?.points ?? 0}
                      size='xs'
                      showName={false}
                      className='font-mono text-white/72'
                    />
                  </p>
                  <p className='mt-2 flex items-center justify-between'>
                    <span>成交规则</span>
                    <span className='text-white/72'>支付后立即下架</span>
                  </p>
                </div>
                <button
                  type='button'
                  onClick={() => setConfirmOpen(true)}
                  className='mt-6 flex h-12 w-full items-center justify-center gap-2 bg-[#d84a3f] text-sm font-semibold text-[#130f0f] transition-colors hover:bg-[#df5b51] active:translate-y-px'
                >
                  确认独家购买 <Icons.arrowRight size={17} />
                </button>
                <Link
                  href='/account'
                  className='mt-4 block text-center text-xs text-white/32 hover:text-white'
                >
                  心源不足？前往充值
                </Link>
              </>
            )}
          </div>
          <div className='mt-4 border border-white/10 p-5'>
            <p className='text-xs text-white/34'>购买包含</p>
            <ul className='mt-4 space-y-3 text-xs text-white/52'>
              {[...deliveryFiles.map((file) => `${file.label}原始文件`), '独家成交记录'].map(
                (item) => (
                  <li key={item} className='flex items-center gap-2'>
                    <Icons.check size={14} className='text-[#d9685e]' />
                    {item}
                  </li>
                )
              )}
            </ul>
          </div>
        </aside>
      </div>

      <DemoModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={`购买《${script.title}》独家授权`}
        eyebrow='Final confirmation'
      >
        <div className='text-sm text-white/56'>
          <div className='border-y border-white/10 py-5'>
            <div className='flex items-end justify-between'>
              <span>应付心源</span>
              <HeartPointAmount
                amount={finalPrice}
                size='md'
                className='font-serif text-3xl text-white'
                nameClassName='font-sans text-xs text-white/36'
              />
            </div>
            <div className='mt-3 flex justify-between text-xs text-white/32'>
              <span>购买后余额</span>
              <HeartPointAmount
                amount={Math.max(0, (currentUser?.points ?? 0) - finalPrice)}
                size='xs'
              />
            </div>
          </div>
          <div className='mt-5 space-y-2 text-xs leading-5'>
            {deliveryFiles.map((file) => (
              <p key={file.number} className='flex items-center gap-2'>
                <Icons.check size={14} className='text-[#d9685e]' />
                {file.label}
              </p>
            ))}
          </div>
          <p className='mt-5 text-xs leading-6 text-white/38'>
            确认后立即扣除心源并下架该剧本，其他用户将不能继续访问详情。独家交易不可撤销。
          </p>
          <div className='mt-6 flex gap-3'>
            <button
              type='button'
              onClick={() => setConfirmOpen(false)}
              className='h-11 flex-1 border border-white/14 transition-colors hover:border-white/30'
            >
              取消
            </button>
            <button
              type='button'
              onClick={handlePurchase}
              disabled={purchasing}
              className='h-11 flex-1 bg-[#d84a3f] font-semibold text-[#130f0f] disabled:cursor-wait disabled:opacity-55'
            >
              {purchasing ? '正在锁定剧本…' : '确认购买'}
            </button>
          </div>
        </div>
      </DemoModal>
    </main>
  );
}
