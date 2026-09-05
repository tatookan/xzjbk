'use client';

import { Icons } from '@/components/icons';
import { useState } from 'react';

export type PortalNavItem = {
  label: string;
  href: string;
  external?: boolean;
};

export function MobileNavigation({ items }: { items: PortalNavItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className='md:hidden'>
      <button
        type='button'
        className='portal-menu-button'
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? '关闭导航' : '打开导航'}
        aria-expanded={open}
      >
        {open ? <Icons.close size={20} /> : <Icons.menu size={20} />}
      </button>
      {open ? (
        <nav className='portal-mobile-menu' aria-label='移动端导航'>
          {items.map((item) => (
            <a
              key={item.label}
              href={item.href}
              target={item.external ? '_blank' : undefined}
              rel={item.external ? 'noreferrer' : undefined}
              onClick={() => setOpen(false)}
            >
              <span>{item.label}</span>
              <Icons.arrowRight size={16} />
            </a>
          ))}
        </nav>
      ) : null}
    </div>
  );
}
