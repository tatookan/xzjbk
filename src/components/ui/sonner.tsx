'use client';

import { Toaster as Sonner, type ToasterProps } from 'sonner';

const Toaster = (props: ToasterProps) => (
  <Sonner
    theme='dark'
    className='toaster group'
    style={
      {
        '--normal-bg': '#15171b',
        '--normal-text': '#f4f0e8',
        '--normal-border': 'rgba(255, 255, 255, 0.12)'
      } as React.CSSProperties
    }
    position='top-center'
    {...props}
  />
);

export { Toaster };
