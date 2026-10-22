'use client';

import { Icons } from '@/components/icons';
import { XinzhiBrand } from '@/components/xinzhi-brand';
import { useScriptLibraryDemo } from '@/features/script-library/components/demo-context';
import {
  HeartPointAmount,
  HeartPointMark
} from '@/features/script-library/components/heart-point-mark';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const links = [
  { href: '/scripts', label: '剧本库' },
  { href: '/account', label: '我的剧本' },
  { href: '/agent', label: 'Agent' }
];

export function LibraryHeader() {
  const pathname = usePathname();
  const { role, authPending, currentUser, logout } = useScriptLibraryDemo();
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accountMenuOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAccountMenuOpen(false);
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [accountMenuOpen]);

  return (
    <header className='sticky top-0 z-40 border-b border-white/10 bg-[#0d0e11]/88 text-[#f3efe7] backdrop-blur-xl'>
      <div className='mx-auto flex min-h-16 max-w-[1480px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-12'>
        <div className='flex min-w-0 items-center gap-7'>
          <Link href='/' className='flex shrink-0 items-center gap-3' aria-label='返回新梦门户'>
            <XinzhiBrand
              descriptor='SCRIPT LIBRARY'
              markSize={32}
              descriptorClassName='hidden sm:block'
            />
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
              href='/account#recharge'
              className='hidden text-xs text-white/62 transition-colors hover:text-white sm:block'
            >
              <HeartPointAmount amount={currentUser.points} />
            </Link>
          ) : null}
          {role === 'guest' ? (
            <Link
              href='/login'
              className='rounded-full bg-[#d84a3f] px-4 py-2 text-xs font-semibold text-[#120f0f] transition-transform active:translate-y-px'
            >
              登录 / 注册
            </Link>
          ) : currentUser ? (
            <div ref={accountMenuRef} className='relative'>
              <button
                type='button'
                onClick={() => setAccountMenuOpen((open) => !open)}
                aria-label='打开账户菜单'
                aria-haspopup='menu'
                aria-expanded={accountMenuOpen}
                className='grid size-9 place-items-center rounded-full border border-white/22 bg-white/[0.045] text-sm font-semibold text-white transition-colors hover:border-[#d84a3f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d84a3f]'
              >
                {currentUser.name.trim().slice(0, 1).toUpperCase() || '心'}
              </button>

              {accountMenuOpen ? (
                <div
                  role='menu'
                  className='absolute top-full right-0 mt-3 w-64 border border-white/14 bg-[#15161a] p-2 shadow-[0_22px_70px_rgba(0,0,0,.48)]'
                >
                  <div className='border-b border-white/10 px-3 py-3'>
                    <p className='truncate text-sm font-medium text-white'>{currentUser.name}</p>
                    <p className='mt-1 truncate text-xs text-white/38'>{currentUser.email}</p>
                    {role === 'member' ? (
                      <HeartPointAmount
                        amount={currentUser.points}
                        className='mt-3 font-mono text-xs text-[#df675c]'
                        nameClassName='font-sans text-white/38'
                      />
                    ) : null}
                  </div>

                  <div className='py-2'>
                    {role === 'member' ? (
                      <>
                        <Link
                          role='menuitem'
                          href='/account#recharge'
                          onClick={() => setAccountMenuOpen(false)}
                          className='flex items-center gap-3 px-3 py-2.5 text-sm text-white/62 transition-colors hover:bg-white/5 hover:text-white'
                        >
                          <HeartPointMark size='sm' /> 充值心源
                        </Link>
                        <Link
                          role='menuitem'
                          href='/account#scripts'
                          onClick={() => setAccountMenuOpen(false)}
                          className='flex items-center gap-3 px-3 py-2.5 text-sm text-white/62 transition-colors hover:bg-white/5 hover:text-white'
                        >
                          <Icons.post size={16} stroke={1.6} /> 我的剧本
                        </Link>
                      </>
                    ) : (
                      <Link
                        role='menuitem'
                        href='/admin'
                        onClick={() => setAccountMenuOpen(false)}
                        className='flex items-center gap-3 px-3 py-2.5 text-sm text-white/62 transition-colors hover:bg-white/5 hover:text-white'
                      >
                        <Icons.dashboard size={16} stroke={1.6} /> 管理后台
                      </Link>
                    )}
                    <Link
                      role='menuitem'
                      href='/account'
                      onClick={() => setAccountMenuOpen(false)}
                      className='flex items-center gap-3 px-3 py-2.5 text-sm text-white/62 transition-colors hover:bg-white/5 hover:text-white'
                    >
                      <Icons.user size={16} stroke={1.6} /> 个人中心
                    </Link>
                  </div>

                  <button
                    role='menuitem'
                    type='button'
                    onClick={async () => {
                      setAccountMenuOpen(false);
                      await logout();
                    }}
                    className='flex w-full items-center gap-3 border-t border-white/10 px-3 py-3 text-left text-sm text-white/42 transition-colors hover:text-white'
                  >
                    <Icons.logout size={16} stroke={1.6} /> 退出登录
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
