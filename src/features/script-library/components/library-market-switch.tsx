'use client';

import Link from 'next/link';

import { cn } from '@/lib/utils';

export type LibraryMarket = 'overseas' | 'domestic';

export function LibraryMarketSwitch({ market }: { market: LibraryMarket }) {
  const options: { value: LibraryMarket; label: string; href: string }[] = [
    { value: 'overseas', label: '海外剧本', href: '/scripts' },
    { value: 'domestic', label: '国内剧本', href: '/scripts/domestic' }
  ];

  return (
    <div
      role='tablist'
      aria-label='剧本市场'
      className='inline-flex items-center gap-1 border border-white/12 bg-white/[0.03] p-1 backdrop-blur-md'
    >
      {options.map((option) => (
        <Link
          key={option.value}
          href={option.href}
          role='tab'
          aria-selected={market === option.value}
          className={cn(
            'px-5 py-2.5 text-xs tracking-[0.14em] transition-colors',
            market === option.value
              ? 'bg-[#d84a3f] font-semibold text-[#130f0f]'
              : 'text-white/48 hover:text-white'
          )}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}
