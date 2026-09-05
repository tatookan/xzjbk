'use client';

import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

export function DemoModal({
  open,
  onClose,
  title,
  eyebrow,
  size = 'default',
  children
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  size?: 'default' | 'wide';
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className='fixed inset-0 z-[80] grid place-items-center bg-black/75 p-4 backdrop-blur-sm'>
      <button
        type='button'
        aria-label='关闭弹窗'
        className='absolute inset-0 cursor-default'
        onClick={onClose}
      />
      <section
        role='dialog'
        aria-modal='true'
        aria-label={title}
        className={cn(
          'relative z-10 max-h-[92dvh] w-full overflow-y-auto border border-white/12 bg-[#15161a] p-6 text-[#f4f0e8] shadow-2xl sm:p-8',
          size === 'wide' ? 'max-w-5xl' : 'max-w-lg'
        )}
      >
        <button
          type='button'
          onClick={onClose}
          className='absolute top-4 right-4 grid size-9 place-items-center rounded-full text-white/45 transition-colors hover:bg-white/8 hover:text-white'
          aria-label='关闭'
        >
          <Icons.close size={18} />
        </button>
        {eyebrow ? (
          <p className='mb-3 text-[10px] tracking-[0.22em] text-[#d84a3f] uppercase'>{eyebrow}</p>
        ) : null}
        <h2 className='pr-10 font-serif text-3xl tracking-[-0.035em]'>{title}</h2>
        <div className='mt-6'>{children}</div>
      </section>
    </div>
  );
}
