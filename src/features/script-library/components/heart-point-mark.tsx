import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

const markSizes = {
  xs: { shell: 'size-3.5', icon: 7 },
  sm: { shell: 'size-[18px]', icon: 9 },
  md: { shell: 'size-6', icon: 12 },
  lg: { shell: 'size-9', icon: 18 }
} as const;

type MarkSize = keyof typeof markSizes;

interface HeartPointMarkProps {
  size?: MarkSize;
  className?: string;
}

interface HeartPointAmountProps {
  amount: number;
  prefix?: string;
  size?: MarkSize;
  showName?: boolean;
  className?: string;
  valueClassName?: string;
  nameClassName?: string;
}

export function HeartPointMark({ size = 'sm', className }: HeartPointMarkProps) {
  const dimensions = markSizes[size];

  return (
    <span
      aria-hidden='true'
      className={cn(
        'relative inline-grid shrink-0 place-items-center rounded-full border border-[#ef8b82]/70 bg-[#d84a3f] text-[#160f0f] shadow-[inset_0_0_0_1px_rgba(17,14,14,.14)]',
        dimensions.shell,
        className
      )}
    >
      <Icons.heartFilled size={dimensions.icon} stroke={0} />
      <span className='absolute top-[16%] right-[18%] size-px rounded-full bg-white/72' />
    </span>
  );
}

export function HeartPointAmount({
  amount,
  prefix = '',
  size = 'sm',
  showName = true,
  className,
  valueClassName,
  nameClassName
}: HeartPointAmountProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap', className)}>
      <HeartPointMark size={size} />
      <span className={cn('tabular-nums', valueClassName)}>
        {prefix}
        {amount.toLocaleString()}
      </span>
      {showName ? <span className={nameClassName}>心源</span> : null}
    </span>
  );
}
