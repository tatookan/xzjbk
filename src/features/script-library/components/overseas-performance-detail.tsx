'use client';

import { Icons } from '@/components/icons';
import { useScriptLibraryDemo } from '@/features/script-library/components/demo-context';
import { LibraryHeader } from '@/features/script-library/components/library-header';
import { HeartPointAmount } from '@/features/script-library/components/heart-point-mark';
import { overseasPerformancePreview as script } from '@/features/script-library/api/overseas-performance-preview';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const PURCHASE_KEY = 'demo-overseas-orchard-purchased';
type ReaderMode = 'bilingual' | 'en' | 'zh';

const readerModes: { id: ReaderMode; label: string }[] = [
  { id: 'bilingual', label: '中英对照' },
  { id: 'en', label: '仅英文' },
  { id: 'zh', label: '仅中文' }
];


export function OverseasPerformanceDetail() {
  const { role, currentUser } = useScriptLibraryDemo();
  const [purchased, setPurchased] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [readerMode, setReaderMode] = useState<ReaderMode>('bilingual');
  const [charactersOpen, setCharactersOpen] = useState(false);

  useEffect(() => { setPurchased(window.localStorage.getItem(PURCHASE_KEY) === '1'); }, []);
  const balance = currentUser?.points ?? 0;
  const insufficient = role === 'member' && !purchased && balance < script.price;

  const confirmPurchase = () => {
    setProcessing(true);
    window.setTimeout(() => {
      window.localStorage.setItem(PURCHASE_KEY, '1');
      setPurchased(true); setProcessing(false); setConfirming(false);
    }, 900);
  };

  return (
    <main className='min-h-screen bg-[var(--lib-bg)] text-[var(--lib-text)]'>
      <LibraryHeader />

      <section className='relative isolate overflow-hidden border-b border-[var(--lib-border)]'>
        <Image src={script.image} alt='' fill className='-z-30 scale-110 object-cover opacity-24 blur-2xl' sizes='100vw' />
        <div className='absolute inset-0 -z-20 bg-[radial-gradient(circle_at_76%_22%,rgba(216,74,63,.18),transparent_28%),linear-gradient(90deg,var(--lib-bg)_15%,transparent_62%,var(--lib-bg))]' />
        <div className='absolute inset-0 -z-10 opacity-[0.025] [background-image:repeating-linear-gradient(0deg,transparent,transparent_3px,#fff_4px)]' />
        <div className='mx-auto max-w-[1440px] px-5 pt-8 pb-14 sm:px-8 lg:px-12 lg:pt-12 lg:pb-20'>
          <Link href='/scripts' className='inline-flex items-center gap-2 text-sm text-[var(--lib-text-faint)] transition-colors hover:text-[var(--lib-text)]'>
            <Icons.chevronLeft size={16} /> 返回海外剧本库
          </Link>
          <div className='mt-10 grid items-end gap-10 lg:grid-cols-[210px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)]'>
            <div className='relative aspect-[3/4.2] w-full max-w-[250px] overflow-hidden shadow-[0_28px_80px_rgba(0,0,0,.44)]'>
              <Image src={script.image} alt={`${script.title}封面`} fill priority className='object-cover' sizes='250px' />
            </div>
            <div className='pb-1'>
              <div className='flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] tracking-[0.17em] uppercase'>
                <span className='text-[var(--lib-accent-text)]'>{script.genre}</span>
                <span className='text-[var(--lib-text-dim)]'>{script.presentationMode}</span>
                <span className='text-[var(--lib-text-faint)]'>独家版权 · 一次成交</span>
              </div>
              <h1 className='mt-5 max-w-5xl text-balance font-serif text-[clamp(2.4rem,5.5vw,5.6rem)] leading-[0.86] tracking-[-0.06em]'>{script.title}</h1>
              <div className='mt-6 flex flex-col gap-6 border-t border-[var(--lib-border)] pt-5 sm:flex-row sm:items-end sm:justify-between'>
                <div>
                  <p className='text-xs tracking-[0.14em] text-[var(--lib-text-faint)] uppercase'>海外演绎剧本 · 中英对照</p>
                  <p className='mt-4 max-w-2xl text-lg leading-8 text-[var(--lib-text-dim)]'>{script.synopsis[0]}</p>
                </div>
                <div className='flex shrink-0 gap-7 text-xs text-[var(--lib-text-faint)]'>
                  <span><strong className='mb-1 block font-mono text-lg font-normal text-[var(--lib-text)]'>{script.episodes}</strong>集数</span>
                  <span><strong className='mb-1 block font-mono text-lg font-normal text-[var(--lib-text)]'>2</strong>交付文件</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <nav className='sticky top-16 z-30 border-b border-[var(--lib-border)] bg-[var(--lib-bg)]/92 backdrop-blur-xl' aria-label='剧本详情章节'>
        <div className='mx-auto flex max-w-[1440px] items-center gap-6 overflow-x-auto px-5 sm:px-8 lg:px-12'>
          {[['#overview','项目概览'],['#characters','人物小传'],['#sample','中英试读'],['#director','导演阐述'],['#deliverables','交付内容']].map(([href, label]) => (
            <a key={href} href={href} className='whitespace-nowrap border-b border-transparent py-4 text-xs text-[var(--lib-text-faint)] transition-colors hover:border-[var(--lib-accent)] hover:text-[var(--lib-text)]'>{label}</a>
          ))}
        </div>
      </nav>

      <div className='mx-auto grid max-w-[1440px] gap-14 px-5 py-14 sm:px-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-12 lg:py-20 xl:gap-20'>
        <article className='min-w-0 space-y-20'>
          <section id='overview' className='scroll-mt-36'>
            <div className='grid gap-8 md:grid-cols-[0.36fr_1fr]'>
              <div><h2 className='font-serif text-4xl tracking-[-0.045em]'>项目概览</h2></div>
              <div>
                <h3 className='font-serif text-2xl tracking-[-0.03em] text-[var(--lib-text)]'>故事梗概</h3>
                <div className='mt-5 max-w-3xl space-y-4 text-[15px] leading-8 text-[var(--lib-text-dim)]'>
                  {script.synopsis.map((p, i) => <p key={i}>{p}</p>)}
                </div>
                <dl className='mt-10 grid grid-cols-2 border-y border-[var(--lib-border)] sm:grid-cols-4'>
                  {[['题材', script.genre],['集数', `${script.episodes} 集`],['形式','演绎 · 海外'],['状态', purchased ? '已购买' : '独家在售']].map(([t, v]) => (
                    <div key={t} className='border-b border-[var(--lib-border)] py-5 even:pl-5 sm:border-r sm:border-b-0 sm:px-5 sm:first:pl-0 sm:last:border-r-0'>
                      <dt className='text-[10px] text-[var(--lib-text-faint)]'>{t}</dt>
                      <dd className='mt-2 text-sm text-[var(--lib-text-dim)]'>{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </section>

          <section id='characters' className='scroll-mt-36'>
            <div>
              <button
                type='button'
                onClick={() => setCharactersOpen(!charactersOpen)}
                className='flex w-full items-center justify-between'
              >
                <h2 className='font-serif text-4xl tracking-[-0.045em]'>人物小传</h2>
                <span className='flex items-center gap-2 text-sm text-[var(--lib-text-faint)]'>
                  {charactersOpen ? '收起' : `展开 ${script.characters.length} 人`}
                  <Icons.chevronRight
                    size={16}
                    className={cn('transition-transform', charactersOpen && 'rotate-90')}
                  />
                </span>
              </button>
              {charactersOpen ? (
                <div className='mt-8 grid gap-4 sm:grid-cols-2'>
                  {script.characters.map((c) => (
                    <article key={c.name} className='border border-[var(--lib-border)] bg-[var(--lib-panel)]/80 p-6'>
                      <div className='flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1'>
                        <h3 className='font-serif text-2xl'>{c.name}</h3>
                        <p className='text-[10px] tracking-[0.16em] text-[var(--lib-accent-text)]/85 uppercase'>{c.label}</p>
                      </div>
                      <p className='mt-2 text-xs text-[var(--lib-text-faint)]'>{c.role}</p>
                      <div className='mt-4 space-y-2.5 text-[13px] leading-6 text-[var(--lib-text-dim)]'>
                        {c.intro.map((p, i) => <p key={i}>{p}</p>)}
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
            </div>
          </section>

          <section id='sample' className='scroll-mt-36'>
            {role === 'guest' ? (
              <div className='grid min-h-72 place-items-center border border-dashed border-[var(--lib-border)] text-center'>
                <div>
                  <span className='mx-auto grid size-14 place-items-center rounded-full border border-[var(--lib-accent)]/40 text-[var(--lib-accent-text)]'><Icons.lock size={22} /></span>
                  <p className='mt-6 font-serif text-2xl'>中英对照试读仅对白名单用户开放</p>
                  <Link href='/login' className='mt-7 inline-flex h-11 items-center gap-2 bg-[var(--lib-accent)] px-6 text-sm font-semibold text-[#130f0f]'>登录白名单账号 <Icons.arrowRight size={15} /></Link>
                </div>
              </div>
            ) : (
              <div>
                <div className='flex flex-col justify-between gap-4 sm:flex-row sm:items-end'>
                  <div>
                    <h2 className='font-serif text-4xl tracking-[-0.045em]'>中英对照试读</h2>
                    <p className='mt-4 text-sm text-[var(--lib-text-faint)]'>
                      已开放 {script.previewEpisodes.length} / {script.episodes} 集
                    </p>
                  </div>
                  <div className='flex border border-[var(--lib-border)] p-1'>
                    {readerModes.map((mode) => (
                      <button key={mode.id} type='button' onClick={() => setReaderMode(mode.id)} className={cn('px-4 py-2 text-xs transition-colors', readerMode === mode.id ? 'bg-[var(--lib-accent)] font-semibold text-[#130f0f]' : 'text-[var(--lib-text-faint)] hover:text-[var(--lib-text)]')}>
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className='mt-8 space-y-6'>
                  {script.previewEpisodes.map((ep) => (
                    <div key={ep.ep} className='border border-black/15 bg-white text-[#1a1a1a]'>
                      <div className='border-b border-black/10 bg-[#f8f8f8] px-6 py-3 text-sm font-semibold'>
                        第 {ep.ep} 集
                      </div>
                      <div className='space-y-4 px-6 py-5'>
                        {ep.pairs.map((pair, i) => (
                          <div key={i}>
                            {readerMode !== 'zh' ? (
                              <p className='text-[14px] leading-[1.8] text-[#1a1a1a]'>
                                <span className='mr-2 font-mono text-[10px] text-[#c43a30]'>EN</span>
                                {pair.en}
                              </p>
                            ) : null}
                            {readerMode !== 'en' ? (
                              <p className={cn('text-[14px] leading-[1.8] text-[#333]', readerMode === 'bilingual' && 'mt-1')}>
                                <span className='mr-2 font-mono text-[10px] text-[#888]'>ZH</span>
                                {pair.zh}
                              </p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <p className='text-center text-sm text-[var(--lib-text-faint)]'>
                    试读到此结束 · 完整剧本 {script.episodes} 集 · 2 份 DOCX
                  </p>
                </div>
              </div>
            )}
          </section>

          <section id='director' className='scroll-mt-36 bg-[var(--lib-panel)]'>
            <div className='grid md:grid-cols-[0.36fr_1fr]'>
              <div className='border-b border-[var(--lib-border)] p-7 md:border-r md:border-b-0 md:p-9'>
                <h2 className='mt-3 font-serif text-4xl leading-none tracking-[-0.045em]'>导演阐述</h2>
              </div>
              <div className='p-7 md:p-10 lg:p-12'>
                <p className='max-w-3xl text-[15px] leading-8 text-[var(--lib-text-dim)]'>{script.directorStatement}</p>
                <div className='mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-[var(--lib-border)] pt-5 text-xs text-[var(--lib-text-faint)]'>
                  {script.tags.map((tag) => <span key={tag}>#{tag}</span>)}
                </div>
              </div>
            </div>
          </section>

          <section id='deliverables' className='scroll-mt-36'>
            <div className='grid gap-8 md:grid-cols-[0.36fr_1fr]'>
              <div><h2 className='font-serif text-4xl tracking-[-0.045em]'>交付内容</h2></div>
              <div>
                <p className='text-sm text-[var(--lib-text-faint)]'>购买前仅展示文件类型，不提供完整内容。购买后交付 2 份原始 DOCX。</p>
                <div className='mt-6 border border-[var(--lib-border)]'>
                  {script.deliverableFiles.map((file, i) => (
                    <div key={i} className={`flex items-center gap-4 bg-[var(--lib-panel-2)] px-5 py-4 ${i > 0 ? 'border-t border-[var(--lib-border)]' : ''}`}>
                      <Icons.page size={18} className='text-[var(--lib-accent-text)]' />
                      <div>
                        <p className='text-sm font-medium'>{file.name}</p>
                        <p className='mt-0.5 text-xs text-[var(--lib-text-faint)]'>{file.description}</p>
                      </div>
                      <span className='ml-auto font-mono text-xs text-[var(--lib-text-faint)]'>{String(i + 1).padStart(2, '0')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </article>

        <aside className='lg:sticky lg:top-36'>
          <div className='border border-[var(--lib-border)] bg-[var(--lib-panel)] p-7'>
            <p className='text-[10px] tracking-[0.24em] text-[var(--lib-accent-text)] uppercase'>独家授权</p>
            <p className='mt-3 font-serif text-4xl'><HeartPointAmount amount={script.price} /></p>
            <p className='mt-2 text-xs text-[var(--lib-text-faint)]'>独家授权 · 单次成交 · 售出即下架</p>
            <dl className='mt-6 space-y-3 border-y border-[var(--lib-border)] py-5 text-sm'>
              <div className='flex justify-between'><dt className='text-[var(--lib-text-faint)]'>集数</dt><dd className='text-[var(--lib-text)]'>{script.episodes} 集</dd></div>
              <div className='flex justify-between'><dt className='text-[var(--lib-text-faint)]'>形式</dt><dd className='text-[var(--lib-text)]'>演绎 · 海外</dd></div>
              <div className='flex justify-between'><dt className='text-[var(--lib-text-faint)]'>交付</dt><dd className='text-[var(--lib-text)]'>2 × DOCX</dd></div>
            </dl>
            {role === 'guest' ? (
              <Link href='/login' className='mt-6 flex h-12 items-center justify-center gap-2 bg-[var(--lib-accent)] text-sm font-semibold text-[#130f0f]'>登录后购买 <Icons.arrowRight size={16} /></Link>
            ) : purchased ? (
              <div className='mt-6 space-y-3'>
                <a href='/preview/orchard-english.docx' download='orchard-english.docx' className='flex h-12 items-center justify-center gap-2 bg-[var(--lib-accent)] text-sm font-semibold text-[#130f0f]'><Icons.download size={16} /> 英文剧本 DOCX</a>
                <a href='/preview/orchard-bilingual.docx' download='orchard-bilingual.docx' className='flex h-12 items-center justify-center gap-2 border border-[var(--lib-border)] text-sm text-[var(--lib-text-dim)]'><Icons.download size={16} /> 中英对照 DOCX</a>
              </div>
            ) : (
              <button type='button' onClick={() => setConfirming(true)} disabled={insufficient} className='mt-6 flex h-12 w-full items-center justify-center gap-2 bg-[var(--lib-accent)] text-sm font-semibold text-[#130f0f] disabled:opacity-45'>购买完整剧本 <Icons.arrowRight size={16} /></button>
            )}
            <p className='mt-3 text-center text-[10px] text-[var(--lib-text-faint)]'>
              {purchased ? '已购买' : role === 'guest' ? '白名单登录后可购买' : insufficient ? `余额不足（${balance.toLocaleString()}）` : `余额 ${balance.toLocaleString()} 心源`}
            </p>
          </div>

          {confirming ? (
            <div className='fixed inset-0 z-50 grid place-items-center bg-black/72 px-5 backdrop-blur-sm' role='dialog' aria-modal='true' onClick={() => !processing && setConfirming(false)}>
              <div className='w-full max-w-md border border-[var(--lib-border)] bg-[var(--lib-panel)] p-8 text-[var(--lib-text)] shadow-2xl' onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                <p className='text-[10px] tracking-[0.28em] text-[var(--lib-accent-text)] uppercase'>确认购买</p>
                <h3 className='mt-3 font-serif text-3xl'>确认购买剧本</h3>
                <p className='mt-2 text-sm text-[var(--lib-text-dim)]'>{script.title}</p>
                <div className='mt-6 space-y-3 border-y border-[var(--lib-border)] py-5 text-sm'>
                  <div className='flex justify-between'><span className='text-[var(--lib-text-faint)]'>剧本价格</span><span className='font-mono'><HeartPointAmount amount={script.price} /></span></div>
                  <div className='flex justify-between'><span className='text-[var(--lib-text-faint)]'>当前余额</span><span className='font-mono text-[var(--lib-text-dim)]'>{balance.toLocaleString()} 心源</span></div>
                  <div className='flex justify-between'><span className='text-[var(--lib-text-faint)]'>购买后余额</span><span className='font-mono text-[var(--lib-accent-text)]'>{(balance - script.price).toLocaleString()} 心源</span></div>
                </div>
                <p className='mt-5 border border-[var(--lib-accent)]/30 bg-[var(--lib-accent)]/8 px-4 py-3 text-xs text-[var(--lib-text-dim)]'>独家授权仅成交一次：购买后剧本立即下架，交付 2 份 DOCX 文件（英文 + 中英对照）。</p>
                <div className='mt-7 flex gap-3'>
                  <button type='button' onClick={() => setConfirming(false)} disabled={processing} className='h-12 flex-1 border border-[var(--lib-border)] text-sm text-[var(--lib-text-dim)] disabled:opacity-50'>取消</button>
                  <button type='button' onClick={confirmPurchase} disabled={processing} className='flex h-12 flex-1 items-center justify-center gap-2 bg-[var(--lib-accent)] text-sm font-semibold text-[#130f0f] disabled:opacity-60'>
                    {processing ? <><Icons.refresh size={15} className='animate-spin' /> 正在锁定…</> : <><Icons.check size={15} /> 确认支付 {script.price.toLocaleString()}</>}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </aside>
      </div>

      <footer className='border-t border-[var(--lib-border)] bg-[var(--lib-bg-deep)] px-5 py-8 text-center text-[10px] text-[var(--lib-text-faint)]'>
        设计预览模式 · 中英配对由两份 docx 解析生成
      </footer>
    </main>
  );
}
