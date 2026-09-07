import { Icons } from '@/components/icons';
import { XinzhiBrand } from '@/components/xinzhi-brand';
import { HeroVideo } from '@/features/portal/components/hero-video';
import {
  MobileNavigation,
  type PortalNavItem
} from '@/features/portal/components/mobile-navigation';
import { WorkReel } from '@/features/portal/components/work-reel';

const studioCnUrl =
  process.env.NEXT_PUBLIC_STUDIO_CN_URL ??
  process.env.NEXT_PUBLIC_STUDIO_URL ??
  'https://studio.xinsee.cc/v2';
const studioGlobalUrl =
  process.env.NEXT_PUBLIC_STUDIO_GLOBAL_URL ?? 'https://overseas.studio.xinsee.cc/v2';
const scriptLibraryUrl = process.env.NEXT_PUBLIC_SCRIPT_LIBRARY_URL ?? '/scripts';

const navItems: PortalNavItem[] = [
  { label: '首页', href: '#home' },
  { label: '心智 Studio', href: '#studio' },
  { label: '漫剧作品', href: '#works' },
  {
    label: '剧本库',
    href: scriptLibraryUrl,
    external: scriptLibraryUrl.startsWith('http')
  }
];

function ArrowLink({
  href,
  children,
  tone = 'light',
  external = false
}: {
  href: string;
  children: React.ReactNode;
  tone?: 'light' | 'dark' | 'outline';
  external?: boolean;
}) {
  return (
    <a
      className={`portal-cta portal-cta-${tone}`}
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
    >
      <span>{children}</span>
      <Icons.arrowRight size={17} stroke={1.8} />
    </a>
  );
}

export default function Page() {
  return (
    <main className='portal-page min-h-screen bg-[#0b0c0e] text-[#f4f0e8]'>
      <header className='fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#0b0c0e]/70 backdrop-blur-xl'>
        <div className='mx-auto flex h-[72px] max-w-[1480px] items-center justify-between px-5 sm:px-8 lg:px-12'>
          <a href='#home' className='group flex items-center gap-3' aria-label='心智首页'>
            <XinzhiBrand
              markSize={34}
              className='text-[#f4f0e8] transition-opacity group-hover:opacity-[.78]'
              descriptorClassName='hidden sm:block'
            />
          </a>

          <nav className='hidden items-center gap-7 md:flex' aria-label='主导航'>
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noreferrer' : undefined}
                className='text-[13px] text-white/68 transition-colors hover:text-white'
              >
                {item.label}
              </a>
            ))}
          </nav>
          <MobileNavigation items={navItems} />
        </div>
      </header>

      <section id='home' className='relative flex min-h-[100svh] items-end overflow-hidden'>
        <HeroVideo />
        <div className='relative z-10 mx-auto w-full max-w-[1480px] px-5 pb-20 sm:px-8 sm:pb-24 lg:px-12 lg:pb-28'>
          <div className='max-w-[820px]'>
            <p className='portal-reveal mb-5 text-[11px] font-medium tracking-[0.3em] text-white/65 uppercase'>
              AI 漫剧制作
            </p>
            <h1 className='portal-reveal portal-reveal-delay font-serif text-[clamp(4.2rem,10vw,9.5rem)] leading-[0.82] font-medium tracking-[-0.075em] text-[#f7f2e9]'>
              让故事
              <br />
              先一步上映
            </h1>
            <div className='portal-reveal portal-reveal-delay-2 mt-8 flex max-w-[690px] flex-col justify-between gap-7 border-t border-white/25 pt-6 sm:flex-row sm:items-end'>
              <p className='max-w-md text-[15px] leading-7 text-white/72 sm:text-base'>
                从剧本到成片，心智让每个想象拥有可被观看的形态。
              </p>
              <div className='flex flex-wrap gap-3'>
                <ArrowLink href='#studio' tone='light'>
                  进入心智 Studio
                </ArrowLink>
                <ArrowLink
                  href={scriptLibraryUrl}
                  external={scriptLibraryUrl.startsWith('http')}
                  tone='outline'
                >
                  进入剧本库
                </ArrowLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id='works'
        className='portal-section overflow-hidden bg-[#f0ece3] py-12 text-[#16171a] sm:py-16 lg:py-20'
      >
        <WorkReel />
      </section>

      <section
        id='studio'
        className='portal-studio portal-section relative min-h-[82svh] overflow-hidden'
      >
        <div className='absolute inset-0 bg-[url(/portal/hero-keyframe.jpg)] bg-cover bg-center' />
        <div className='absolute inset-0 bg-[linear-gradient(90deg,rgba(8,9,11,.94)_0%,rgba(8,9,11,.68)_48%,rgba(8,9,11,.18)_100%)]' />
        <div className='relative mx-auto flex min-h-[82svh] max-w-[1480px] items-center px-5 py-24 sm:px-8 lg:px-12'>
          <div className='max-w-3xl'>
            <p className='mb-5 text-[11px] tracking-[0.28em] text-[#d84a3f] uppercase'>
              心智 Studio
            </p>
            <h2 className='font-serif text-[clamp(3.4rem,7.2vw,7.8rem)] leading-[0.9] tracking-[-0.065em]'>
              一站式漫剧
              <br />
              创作平台
            </h2>
            <p className='mt-8 max-w-lg text-[16px] leading-8 text-white/68'>
              从角色、分镜到画面生成与成片管理，一套工具承接完整的 AI
              漫剧制作过程，让团队专注于故事本身。
            </p>
            <div className='mt-9 flex flex-wrap gap-3'>
              <ArrowLink href={studioCnUrl} external={studioCnUrl.startsWith('http')} tone='light'>
                进入国内版
              </ArrowLink>
              <ArrowLink
                href={studioGlobalUrl}
                external={studioGlobalUrl.startsWith('http')}
                tone='outline'
              >
                进入海外版
              </ArrowLink>
            </div>
          </div>
        </div>
      </section>

      <section
        id='scripts'
        className='portal-section bg-[#d84a3f] py-24 text-[#130f0f] sm:py-32 lg:py-40'
      >
        <div className='mx-auto grid max-w-[1480px] gap-16 px-5 sm:px-8 lg:grid-cols-[1.25fr_0.55fr] lg:items-end lg:px-12'>
          <h2 className='font-serif text-[clamp(3.7rem,7.7vw,8.2rem)] leading-[0.88] tracking-[-0.07em]'>
            下一部作品，
            <br />
            从一个好本开始。
          </h2>
          <div className='border-t border-black/35 pt-6'>
            <p className='text-[16px] leading-8 text-black/68'>
              精选适合漫剧改编与制作的剧本。查看导演阐述与部分中英对照试读，找到值得被拍出来的下一部故事。
            </p>
            <div className='mt-8'>
              <ArrowLink
                href={scriptLibraryUrl}
                external={scriptLibraryUrl.startsWith('http')}
                tone='dark'
              >
                进入剧本库
              </ArrowLink>
            </div>
          </div>
        </div>
      </section>

      <footer className='bg-[#0b0c0e] px-5 py-8 text-[11px] tracking-[0.18em] text-white/40 sm:px-8 lg:px-12'>
        <div className='mx-auto flex max-w-[1480px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <span>© 2026 XINZHI PICTURES</span>
          <span>AI 漫剧，让故事先一步上映</span>
        </div>
      </footer>
    </main>
  );
}
