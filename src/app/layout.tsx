import { Toaster } from '@/components/ui/sonner';
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import NextTopLoader from 'nextjs-toploader';
import '../styles/globals.css';

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans'
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono'
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: {
    default: '心智 XINZHI | AI 漫剧制作',
    template: '%s | 心智 XINZHI'
  },
  description: '从剧本到成片，心智让每个想象拥有可被观看的形态。',
  openGraph: {
    title: '心智 XINZHI | AI 漫剧制作',
    description: '从剧本到成片，心智让每个想象拥有可被观看的形态。',
    siteName: '心智 XINZHI',
    type: 'website',
    images: [
      {
        url: '/portal/hero-keyframe.jpg',
        width: 1672,
        height: 941,
        alt: '心智 AI 漫剧制作门户'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: '心智 XINZHI | AI 漫剧制作',
    description: '从剧本到成片，心智让每个想象拥有可被观看的形态。',
    images: ['/portal/hero-keyframe.jpg']
  }
};

export const viewport: Viewport = {
  themeColor: '#0b0c0e'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='zh-CN' className='dark'>
      <body
        className={`${geistSans.variable} ${geistMono.variable} overflow-x-hidden font-sans antialiased`}
      >
        <NextTopLoader color='#d84a3f' showSpinner={false} />
        <Toaster />
        {children}
      </body>
    </html>
  );
}
