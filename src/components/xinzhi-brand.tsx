import { cn } from '@/lib/utils';
import Image from 'next/image';

type XinzhiBrandProps = {
  descriptor?: string;
  markSize?: number;
  tone?: 'dark' | 'light';
  className?: string;
  wordmarkClassName?: string;
  descriptorClassName?: string;
};

export function XinzhiBrand({
  descriptor = 'XINMENG PICTURES',
  markSize = 36,
  tone = 'dark',
  className,
  wordmarkClassName,
  descriptorClassName
}: XinzhiBrandProps) {
  const markSrc =
    tone === 'dark' ? '/brand/xinzhi-mark-on-dark.svg' : '/brand/xinzhi-mark-on-light.svg';

  return (
    <span className={cn('inline-flex min-w-0 items-center gap-3', className)}>
      <Image
        src={markSrc}
        alt=''
        width={markSize}
        height={markSize}
        unoptimized
        className='shrink-0'
      />
      <span className='min-w-0 leading-none'>
        <span
          className={cn(
            'block text-[15px] font-semibold tracking-[0.16em] whitespace-nowrap',
            wordmarkClassName
          )}
        >
          心梦
        </span>
        {descriptor ? (
          <span
            className={cn(
              'mt-1.5 block text-[9px] tracking-[0.19em] whitespace-nowrap opacity-[.48]',
              descriptorClassName
            )}
          >
            {descriptor}
          </span>
        ) : null}
      </span>
    </span>
  );
}
