'use client';

import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useScriptLibraryDemo } from '@/features/script-library/components/demo-context';
import { LibraryHeader } from '@/features/script-library/components/library-header';
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
      <div className='relative aspect-[3/4.2] overflow-hidden bg-[#191b20]'>
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
            <p className='text-[10px] tracking-[0.18em] text-white/36 uppercase'>{script.genre}</p>
            <h3 className='mt-1 flex flex-wrap items-baseline gap-x-2 font-serif text-2xl tracking-[-0.03em]'>
              {script.title}
              <span className='font-sans text-[10px] font-medium tracking-[0.12em] text-[#d9685e]'>
                {script.presentationMode}
              </span>
            </h3>
            <p className='mt-1 line-clamp-1 text-[10px] tracking-[0.06em] text-white/28'>
              {script.englishTitle}
            </p>
          </div>
          <span className='pt-4 text-xs tabular-nums text-white/48'>
            {script.episodes ? `${script.episodes} 集` : '集数待定'}
          </span>
        </div>
        <p className='line-clamp-2 min-h-12 text-sm leading-6 text-white/52'>{script.logline}</p>
        <div className='mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-xs'>
          <span className='text-white/42'>
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
          <span className={canOpen ? 'text-[#e46b60]' : 'text-white/28'}>{actionLabel}</span>
        </div>
      </div>
    </article>
  );

  return canOpen ? (
    <Link
      href={`/scripts/${script.id}`}
      className='block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d84a3f]'
    >
      {card}
    </Link>
  ) : (
    <div aria-disabled='true'>{card}</div>
  );
}

export function LibraryHome() {
  const { scripts, role, scriptsLoading, purchasedIds } = useScriptLibraryDemo();
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('全部');
  const [catalogueStatus, setCatalogueStatus] = useState<CatalogueStatus>('all');
  const [presentation, setPresentation] = useState<PresentationFilter>('全部形式');
  const catalogueScripts = useMemo(
    () => scripts.filter((script) => script.status !== 'draft' || role === 'admin'),
    [role, scripts]
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
    <main className='min-h-screen bg-[#0d0e11] text-[#f4f0e8]'>
      <LibraryHeader />

      <section className='border-b border-white/10'>
        <div className='mx-auto grid min-h-[56vh] max-w-[1480px] items-end gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-12 lg:py-24'>
          <div>
            <p className='mb-5 text-[11px] tracking-[0.28em] text-[#d84a3f] uppercase'>
              One script. One buyer.
            </p>
            <h1 className='max-w-4xl font-serif text-[clamp(3.8rem,7.4vw,7.7rem)] leading-[0.86] tracking-[-0.065em]'>
              找到下一部
              <br />
              值得制作的剧本
            </h1>
          </div>
          <div className='max-w-md justify-self-start lg:justify-self-end'>
            <p className='text-base leading-8 text-white/56'>
              面向专业制作团队的独家剧本库。每个剧本只成交一次，售出后立即停止展示详情与交易。
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
        <div className='mb-10 border-b border-white/10 pb-7'>
          <div className='flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between'>
            <div>
              <p className='text-xs text-white/34'>SCRIPT CATALOGUE / {visibleScripts.length}</p>
              <h2 className='mt-2 font-serif text-4xl tracking-[-0.035em]'>剧本目录</h2>
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
                className='h-11 w-full border border-white/12 bg-white/[0.03] pr-4 pl-10 text-sm outline-none placeholder:text-white/28 focus:border-[#d84a3f]'
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
                      : 'text-white/38 hover:text-white/68'
                  )}
                >
                  {option.label}
                  <span className='ml-2 font-mono text-[9px] text-white/24'>{option.count}</span>
                </button>
              ))}
            </div>

            <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
              <span className='hidden text-[10px] tracking-[0.16em] text-white/24 uppercase xl:inline'>
                Filter by
              </span>
              <select
                value={genre}
                onChange={(event) => setGenre(event.target.value)}
                aria-label='按题材筛选'
                className='h-10 min-w-36 border border-white/12 bg-[#121318] px-3 text-xs text-white/64 outline-none focus:border-[#d84a3f]'
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
                className='h-10 min-w-32 border border-white/12 bg-[#121318] px-3 text-xs text-white/64 outline-none focus:border-[#d84a3f]'
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
                  className='h-10 px-2 text-xs text-white/34 transition-colors hover:text-[#e46b60]'
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
          <div className='grid min-h-72 place-items-center border border-white/10 text-sm text-white/42'>
            没有符合条件的剧本
          </div>
        )}
      </section>
    </main>
  );
}
