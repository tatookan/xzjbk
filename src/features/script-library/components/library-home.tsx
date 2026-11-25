'use client';

import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useScriptLibraryDemo } from '@/features/script-library/components/demo-context';
import { LibraryHeader } from '@/features/script-library/components/library-header';
import { LibraryMarketSwitch, type LibraryMarket } from '@/features/script-library/components/library-market-switch';
import { domesticPreviewScripts } from '@/features/script-library/api/domestic-preview';
import { HeartPointAmount } from '@/features/script-library/components/heart-point-mark';
import type { DemoScript } from '@/features/script-library/api/types';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';

type CatalogueStatus = 'all' | 'available' | 'sold' | 'purchased' | 'draft';
type PresentationFilter = '全部形式' | DemoScript['presentationMode'];

function ScriptCard({ script, purchased }: { script: DemoScript; purchased: boolean }) {
  const { role } = useScriptLibraryDemo();
  const isSold = script.status === 'sold';
  const canOpen = role !== 'guest' && (!isSold || role === 'admin' || purchased);
  const actionLabel = isSold
    ? purchased
      ? '查看并下载'
      : role === 'admin'
        ? '查看成交档案'
        : '不可查看'
    : role === 'guest'
      ? '登录后查看'
      : '查看详情';
  const card = (
    <article className='group relative'>
      <div className='relative aspect-[3/4.2] overflow-hidden bg-[var(--lib-card-cover-bg)]'>
        <Image
          src={script.image}
          alt={`${script.title}封面`}
          fill
          className={cn(
            'object-cover transition duration-700 group-hover:scale-[1.025]',
            isSold && 'grayscale-[.75] opacity-55'
          )}
          sizes='(max-width: 640px) 84vw, (max-width: 1024px) 42vw, 24vw'
        />
        <div className='absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent' />
        <div className='absolute top-4 left-4 flex gap-2'>
          <span
            className={cn(
              'border px-2.5 py-1 text-[10px] tracking-[0.16em] uppercase backdrop-blur-md',
              isSold
                ? 'border-white/20 bg-black/35 text-white/60'
                : 'border-[#df675c]/70 bg-[#a62f28]/55 text-white'
            )}
          >
            {isSold ? '已售出' : '独家授权'}
          </span>
        </div>
        {role === 'guest' && !isSold ? (
          <span className='absolute right-4 bottom-4 grid size-9 place-items-center rounded-full bg-black/50 text-white/76 backdrop-blur-md'>
            <Icons.lock size={15} />
          </span>
        ) : null}
      </div>
      <div className='pt-4'>
        <div className='mb-2 flex items-start justify-between gap-4'>
          <div>
            <p className='text-[10px] tracking-[0.18em] text-[var(--lib-text-faint)] uppercase'>{script.genre}</p>
            <h3 className='mt-1 flex flex-wrap items-baseline gap-x-2 font-serif text-2xl tracking-[-0.03em]'>
              {script.title}
              <span className='font-sans text-[10px] font-medium tracking-[0.12em] text-[var(--lib-accent-text)]'>
                {script.presentationMode}
              </span>
            </h3>
            <p className='mt-1 line-clamp-1 text-[10px] tracking-[0.06em] text-[var(--lib-text-faint)]'>
              {script.englishTitle}
            </p>
          </div>
          <span className='pt-4 text-xs tabular-nums text-[var(--lib-text-faint)]'>
            {script.episodes ? `${script.episodes} 集` : '集数待定'}
          </span>
        </div>
        <p className='line-clamp-2 min-h-12 text-sm leading-6 text-[var(--lib-text-dim)]'>{script.logline}</p>
        <div className='mt-4 flex items-center justify-between border-t border-[var(--lib-border)] pt-3 text-xs'>
          <span className='text-[var(--lib-text-faint)]'>
            {isSold ? (
              purchased ? (
                '已购买'
              ) : (
                '交易已完成'
              )
            ) : (
              <HeartPointAmount amount={script.price} />
            )}
          </span>
          <span className={canOpen ? 'text-[var(--lib-accent-text)]' : 'text-[var(--lib-text-faint)]'}>{actionLabel}</span>
        </div>
      </div>
    </article>
  );

  const isPreviewFixture = script.id.startsWith('demo-');
  const previewHref = script.id === 'demo-domestic-wedding' ? '/scripts/demo-domestic-wedding' : script.id === 'demo-overseas-orchard' ? '/scripts/demo-overseas-orchard' : null;

  return canOpen && (!isPreviewFixture || previewHref) ? (
    <Link
      href={previewHref ?? `/scripts/${script.id}`}
      className='block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d84a3f]'
    >
      {card}
    </Link>
  ) : (
    <div aria-disabled='true' title={isPreviewFixture ? '设计预览数据' : undefined}>
      {card}
    </div>
  );
}

export function LibraryHome({ market = 'overseas' }: { market?: LibraryMarket }) {
  const { scripts: apiScripts, role, scriptsLoading, purchasedIds } = useScriptLibraryDemo();
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('全部');
  const [catalogueStatus, setCatalogueStatus] = useState<CatalogueStatus>('all');
  const [presentation, setPresentation] = useState<PresentationFilter>('全部形式');
  const catalogueScripts = useMemo(
    () =>
      (market === 'domestic'
        ? [...apiScripts.filter((script) => script.market === 'domestic'), ...domesticPreviewScripts]
        : apiScripts.filter((script) => script.market !== 'domestic')
      ).filter((script) => script.status !== 'draft' || role === 'admin'),
    [apiScripts, market, role]
  );
  const genres = useMemo(
    () => ['全部', ...new Set(catalogueScripts.map((script) => script.genre))],
    [catalogueScripts]
  );
  const counts = useMemo(
    () => ({
      all: catalogueScripts.length,
      available: catalogueScripts.filter((script) => script.status === 'available').length,
      sold: catalogueScripts.filter((script) => script.status === 'sold').length,
      purchased: catalogueScripts.filter((script) => purchasedIds.includes(script.id)).length,
      draft: catalogueScripts.filter((script) => script.status === 'draft').length
    }),
    [catalogueScripts, purchasedIds]
  );
  const statusOptions = useMemo(
    () => [
      { value: 'all' as const, label: '全部', count: counts.all },
      { value: 'available' as const, label: '可购买', count: counts.available },
      { value: 'sold' as const, label: '已售出', count: counts.sold },
      ...(role !== 'guest' && counts.purchased
        ? [{ value: 'purchased' as const, label: '我已购买', count: counts.purchased }]
        : []),
      ...(role === 'admin' && counts.draft
        ? [{ value: 'draft' as const, label: '草稿', count: counts.draft }]
        : [])
    ],
    [counts, role]
  );

  const visibleScripts = useMemo(
    () =>
      catalogueScripts.filter((script) => {
        const matchesGenre = genre === '全部' || script.genre === genre;
        const matchesPresentation =
          presentation === '全部形式' || script.presentationMode === presentation;
        const matchesStatus =
          catalogueStatus === 'all' ||
          (catalogueStatus === 'purchased'
            ? purchasedIds.includes(script.id)
            : script.status === catalogueStatus);
        const keyword = query.trim().toLowerCase();
        const matchesQuery =
          !keyword ||
          script.title.toLowerCase().includes(keyword) ||
          script.englishTitle.toLowerCase().includes(keyword) ||
          script.tags.some((tag) => tag.toLowerCase().includes(keyword));
        return matchesGenre && matchesPresentation && matchesStatus && matchesQuery;
      }),
    [catalogueScripts, catalogueStatus, genre, presentation, purchasedIds, query]
  );
  const filtersActive =
    query.trim() || genre !== '全部' || catalogueStatus !== 'all' || presentation !== '全部形式';

  return (
    <main className='min-h-screen bg-[var(--lib-bg)] text-[var(--lib-text)]'>
      <LibraryHeader />

      <section className='border-b border-[var(--lib-border)]'>
        <div className='mx-auto grid min-h-[56vh] max-w-[1480px] items-end gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-12 lg:py-24'>
          <div>
            <div className='mb-7'>
              <LibraryMarketSwitch market={market} />
            </div>
            <p className='mb-5 text-[11px] tracking-[0.28em] text-[#d84a3f] uppercase'>
              {market === 'domestic' ? 'Made for China market' : 'One script. One buyer.'}
            </p>
            <h1 className='max-w-4xl font-serif text-[clamp(3.8rem,7.4vw,7.7rem)] leading-[0.86] tracking-[-0.065em]'>
              {market === 'domestic' ? (
                <>
                  国内市场
                  <br />
                  爆款剧本专场
                </>
              ) : (
                <>
                  找到下一部
                  <br />
                  值得制作的剧本
                </>
              )}
            </h1>
          </div>
          <div className='max-w-md justify-self-start lg:justify-self-end'>
            <p className='text-base leading-8 text-white/56'>
              {market === 'domestic'
                ? '面向国内短剧平台的独家中文剧本：女频、男频、家庭、年代与古装题材，独家授权一次成交。'
                : '面向专业制作团队的独家剧本库。每个剧本只成交一次，售出后立即停止展示详情与交易。'}
            </p>
            {role === 'guest' ? (
              <Link
                href='/login'
                className='mt-7 inline-flex items-center gap-3 bg-[#d84a3f] px-5 py-3 text-sm font-semibold text-[#130f0f]'
              >
                使用注册码加入 <Icons.arrowRight size={17} />
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className='mx-auto max-w-[1480px] px-5 py-14 sm:px-8 lg:px-12 lg:py-20'>
        <div className='mb-10 border-b border-[var(--lib-border)] pb-7'>
          <div className='flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between'>
            <div>
              <p className='text-xs text-[var(--lib-text-faint)]'>
                {market === 'domestic' ? 'DOMESTIC CATALOGUE' : 'OVERSEAS CATALOGUE'} / {visibleScripts.length}
              </p>
              <h2 className='mt-2 font-serif text-4xl tracking-[-0.035em]'>
                {market === 'domestic' ? '国内剧本目录' : '海外剧本目录'}
              </h2>
            </div>
            <div className='relative w-full lg:w-80'>
              <Icons.search
                className='absolute top-1/2 left-3 -translate-y-1/2 text-white/35'
                size={16}
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label='搜索剧本'
                placeholder='搜索剧名或标签'
                className='h-11 w-full border border-[var(--lib-border)] bg-[var(--lib-bg-soft)] pr-4 pl-10 text-sm outline-none placeholder:text-[var(--lib-text-faint)] focus:border-[#d84a3f]'
              />
            </div>
          </div>

          <div className='mt-7 flex flex-col gap-5 border-t border-white/[0.07] pt-5 xl:flex-row xl:items-center xl:justify-between'>
            <div className='flex flex-wrap gap-x-6 gap-y-2' aria-label='按销售状态筛选'>
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  type='button'
                  onClick={() => setCatalogueStatus(option.value)}
                  aria-pressed={catalogueStatus === option.value}
                  className={cn(
                    'relative py-2 text-xs transition-colors after:absolute after:right-0 after:bottom-0 after:left-0 after:h-px after:origin-left after:scale-x-0 after:bg-[#d84a3f] after:transition-transform',
                    catalogueStatus === option.value
                      ? 'text-white after:scale-x-100'
                      : 'text-white/38 hover:text-[var(--lib-text-dim)]'
                  )}
                >
                  {option.label}
                  <span className='ml-2 font-mono text-[9px] text-[var(--lib-text-faint)]'>{option.count}</span>
                </button>
              ))}
            </div>

            <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
              <span className='hidden text-[10px] tracking-[0.16em] text-[var(--lib-text-faint)] uppercase xl:inline'>
                Filter by
              </span>
              <select
                value={genre}
                onChange={(event) => setGenre(event.target.value)}
                aria-label='按题材筛选'
                className='h-10 min-w-36 border border-[var(--lib-border)] bg-[var(--lib-panel-2)] px-3 text-xs text-white/64 outline-none focus:border-[#d84a3f]'
              >
                {genres.map((item) => (
                  <option key={item} value={item}>
                    {item === '全部' ? '全部题材' : item}
                  </option>
                ))}
              </select>
              <select
                value={presentation}
                onChange={(event) => setPresentation(event.target.value as PresentationFilter)}
                aria-label='按内容形式筛选'
                className='h-10 min-w-32 border border-[var(--lib-border)] bg-[var(--lib-panel-2)] px-3 text-xs text-white/64 outline-none focus:border-[#d84a3f]'
              >
                <option value='全部形式'>全部形式</option>
                <option value='解说'>解说</option>
                <option value='演绎'>演绎</option>
              </select>
              {filtersActive ? (
                <button
                  type='button'
                  onClick={() => {
                    setQuery('');
                    setGenre('全部');
                    setCatalogueStatus('all');
                    setPresentation('全部形式');
                  }}
                  className='h-10 px-2 text-xs text-[var(--lib-text-faint)] transition-colors hover:text-[var(--lib-accent-text)]'
                >
                  清除筛选
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {scriptsLoading ? (
          <div className='grid gap-x-5 gap-y-14 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className='animate-pulse'>
                <div className='aspect-[3/4.2] bg-white/[0.04]' />
                <div className='mt-4 h-5 w-2/3 bg-white/[0.04]' />
                <div className='mt-3 h-10 bg-white/[0.025]' />
              </div>
            ))}
          </div>
        ) : visibleScripts.length ? (
          <div className='grid gap-x-5 gap-y-14 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
            {visibleScripts.map((script) => (
              <ScriptCard
                key={script.id}
                script={script}
                purchased={purchasedIds.includes(script.id)}
              />
            ))}
          </div>
        ) : (
          <div className='grid min-h-72 place-items-center border border-[var(--lib-border)] text-sm text-[var(--lib-text-faint)]'>
            没有符合条件的剧本
          </div>
        )}
      </section>
    </main>
  );
}
