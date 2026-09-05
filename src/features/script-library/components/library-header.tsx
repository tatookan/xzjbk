'use client';

import { Icons } from '@/components/icons';
import { useScriptLibraryDemo } from '@/features/script-library/components/demo-context';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/scripts', label: '剧本库' },
  { href: '/account', label: '我的剧本' }
];

export function LibraryHeader() {
  const pathname = usePathname();
  const { role, authPending, currentUser, logout } = useScriptLibraryDemo();

  return (
    <header className='sticky top-0 z-40 border-b border-white/10 bg-[#0d0e11]/88 text-[#f3efe7] backdrop-blur-xl'>
      <div className='mx-auto flex min-h-16 max-w-[1480px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-12'>
        <div className='flex min-w-0 items-center gap-7'>
          <Link href='/' className='flex shrink-0 items-center gap-3' aria-label='返回心智门户'>
            <span className='grid size-8 place-items-center border border-white/70 text-[11px] font-semibold tracking-[-0.08em]'>
              心智
            </span>
            <span className='hidden text-[11px] tracking-[0.2em] text-white/48 sm:block'>
              SCRIPT LIBRARY
            </span>
          </Link>
          <nav className='flex items-center gap-5 overflow-x-auto text-sm' aria-label='剧本库导航'>
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  pathname === link.href
                    ? 'whitespace-nowrap text-white'
                    : 'whitespace-nowrap text-white/48 transition-colors hover:text-white'
                }
              >
                {link.label}
              </Link>
            ))}
            {role === 'admin' ? (
              <Link
                href='/admin'
                className={
                  pathname === '/admin'
                    ? 'whitespace-nowrap text-white'
                    : 'whitespace-nowrap text-white/48 transition-colors hover:text-white'
                }
              >
                管理后台
              </Link>
            ) : null}
          </nav>
        </div>

        <div className='flex shrink-0 items-center gap-3'>
          {authPending ? (
            <span className='h-9 w-24 animate-pulse rounded-full bg-white/8' />
          ) : role === 'member' && currentUser ? (
            <Link
              href='/account'
              className='hidden text-xs tabular-nums text-white/62 transition-colors hover:text-white sm:block'
            >
              {currentUser.points.toLocaleString()} 心源
            </Link>
          ) : null}
          {role === 'guest' ? (
            <Link
              href='/login'
              className='rounded-full bg-[#d84a3f] px-4 py-2 text-xs font-semibold text-[#120f0f] transition-transform active:translate-y-px'
            >
              登录 / 注册
            </Link>
          ) : (
            <button
              type='button'
              onClick={logout}
              className='grid size-9 place-items-center rounded-full border border-white/18 text-white/62 transition-colors hover:border-white/45 hover:text-white'
              aria-label='退出账号'
            >
              <Icons.logout size={16} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
