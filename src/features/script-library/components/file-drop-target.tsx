'use client';

import { cn } from '@/lib/utils';
import type { DragEvent, KeyboardEvent, ReactNode } from 'react';
import { useRef, useState } from 'react';

export function FileDropTarget({
  accept,
  ariaLabel,
  className,
  children,
  onSelect
}: {
  accept: string;
  ariaLabel: string;
  className?: string;
  children: (state: { dragging: boolean }) => ReactNode;
  onSelect: (file: File, receivedCount: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);

  const openPicker = () => inputRef.current?.click();

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openPicker();
  };

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    const nextFile = event.dataTransfer.files[0];
    if (nextFile) onSelect(nextFile, event.dataTransfer.files.length);
  };

  return (
    <div
      role='button'
      tabIndex={0}
      aria-label={ariaLabel}
      data-dragging={dragging || undefined}
      onClick={openPicker}
      onKeyDown={handleKeyDown}
      onDragEnter={handleDragEnter}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      }}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#d84a3f]/25',
        className
      )}
    >
      {children({ dragging })}
      <input
        ref={inputRef}
        type='file'
        accept={accept}
        tabIndex={-1}
        className='sr-only'
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          const nextFile = event.currentTarget.files?.[0];
          if (nextFile) onSelect(nextFile, event.currentTarget.files?.length ?? 1);
          event.currentTarget.value = '';
        }}
      />
    </div>
  );
}
