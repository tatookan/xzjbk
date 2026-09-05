'use client';

import { Icons } from '@/components/icons';
import { LibraryHeader } from '@/features/script-library/components/library-header';
import { useScriptLibraryDemo } from '@/features/script-library/components/demo-context';
import Image from 'next/image';
import Link from 'next/link';

export function AccountScreen() {
  const { role, authPending, currentUser, scripts, purchasedIds } = useScriptLibraryDemo();

  if (authPending) {
    return <main className='min-h-screen bg-[#0d0e11]' />;
  }

  if (role === 'guest' || !currentUser) {
    return (
      <main className='min-h-screen bg-[#0d0e11] text-[#f4f0e8]'>
        <LibraryHeader />
        <div className='mx-auto grid min-h-[70vh] max-w-2xl place-items-center px-5 text-center'>
          <div>
            <Icons.lock className='mx-auto text-[#d84a3f]' size={28} />
            <h1 className='mt-6 font-serif text-5xl tracking-[-0.05em]'>登录后查看个人中心</h1>
            <Link
              href='/login'
              className='mt-8 inline-flex items-center gap-2 bg-[#d84a3f] px-5 py-3 text-sm font-semibold text-[#130f0f]'
            >
              登录 / 注册 <Icons.arrowRight size={17} />
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const purchasedScripts = scripts.filter((script) => purchasedIds.includes(script.id));
  return (
    <main className='min-h-screen bg-[#0d0e11] text-[#f4f0e8]'>
      <LibraryHeader />
      <div className='mx-auto max-w-[1280px] px-5 py-12 sm:px-8 lg:px-12 lg:py-16'>
        <header className='flex flex-col justify-between gap-8 border-b border-white/10 pb-10 sm:flex-row sm:items-end'>
          <div>
            <p className='text-[11px] tracking-[0.24em] text-[#d84a3f] uppercase'>Member account</p>
            <h1 className='mt-3 font-serif text-5xl tracking-[-0.05em] sm:text-6xl'>
              {currentUser.name}
            </h1>
            <p className='mt-3 text-sm text-white/38'>{currentUser.email}</p>
          </div>
          <div className='flex gap-10'>
            <div>
              <p className='text-xs text-white/34'>积分余额</p>
              <p className='mt-1 font-serif text-3xl tabular-nums'>
                {currentUser.points.toLocaleString()}
              </p>
            </div>
            <div>
              <p className='text-xs text-white/34'>账号折扣</p>
              <p className='mt-1 font-serif text-3xl tabular-nums'>
                {currentUser.discount / 10} 折
              </p>
            </div>
          </div>
        </header>

        <div className='mt-12 grid gap-12 lg:grid-cols-[1.1fr_0.9fr]'>
          <section>
            <div className='flex items-end justify-between'>
              <div>
                <p className='text-[10px] tracking-[0.2em] text-white/32 uppercase'>My scripts</p>
                <h2 className='mt-2 font-serif text-3xl'>已购剧本</h2>
              </div>
              <span className='text-xs text-white/34'>{purchasedScripts.length} 部</span>
            </div>
            {purchasedScripts.length ? (
              <div className='mt-6 space-y-3'>
                {purchasedScripts.map((script) => (
                  <Link
                    key={script.id}
                    href={`/scripts/${script.id}`}
                    className='grid grid-cols-[72px_1fr_auto] items-center gap-4 border border-white/10 p-3 transition-colors hover:border-white/24'
                  >
                    <div className='relative aspect-[3/4.2] overflow-hidden'>
                      <Image
                        src={script.image}
                        alt={`${script.title}封面`}
                        fill
                        className='object-cover'
                        sizes='72px'
                      />
                    </div>
                    <div>
                      <p className='font-serif text-xl'>{script.title}</p>
                      <p className='mt-1 text-xs text-white/38'>
                        3 份标准交付文件 · {script.format}
                      </p>
                    </div>
                    <Icons.chevronRight className='text-white/32' size={17} />
                  </Link>
                ))}
              </div>
            ) : (
              <div className='mt-6 border border-dashed border-white/12 p-8 text-center'>
                <p className='text-sm text-white/42'>还没有购买剧本</p>
                <Link href='/scripts' className='mt-4 inline-flex text-sm text-[#df675c]'>
                  去剧本库看看
                </Link>
              </div>
            )}
          </section>

          <section className='border border-white/12 bg-white/[0.025] p-6 sm:p-8'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-[10px] tracking-[0.2em] text-white/32 uppercase'>
                  Points recharge
                </p>
                <h2 className='mt-2 font-serif text-3xl'>积分充值</h2>
              </div>
              <span className='border border-white/12 px-2.5 py-1 text-[10px] text-white/38'>
                暂未开放
              </span>
            </div>
            <p className='mt-4 text-sm leading-6 text-white/44'>
              支付宝电脑网站支付接口已经预留，当前阶段不开放在线充值，也不会创建模拟支付订单。
            </p>
            <div className='mt-7 border-y border-white/10 py-6'>
              <div className='flex items-start gap-4'>
                <span className='grid size-10 shrink-0 place-items-center border border-white/12 text-[#d84a3f]'>
                  <Icons.creditCard size={19} />
                </span>
                <div>
                  <p className='text-sm text-white/68'>后续启用时无需调整账户结构</p>
                  <p className='mt-2 text-xs leading-6 text-white/32'>
                    支付创建、支付宝跳转、回调验签和积分入账将通过独立支付模块接入。
                  </p>
                </div>
              </div>
            </div>
            <button
              type='button'
              disabled
              className='mt-6 flex h-12 w-full cursor-not-allowed items-center justify-center gap-2 border border-white/10 bg-white/[0.035] text-sm text-white/30'
            >
              在线充值暂未开放
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}
