'use client';

import { Icons } from '@/components/icons';
import { LibraryHeader } from '@/features/script-library/components/library-header';
import { DemoModal } from '@/features/script-library/components/demo-modal';
import { useScriptLibraryDemo } from '@/features/script-library/components/demo-context';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

const rechargeOptions = [100, 200, 500, 1000];

export function AccountScreen() {
  const { role, currentUser, scripts, purchasedIds, recharge } = useScriptLibraryDemo();
  const [amount, setAmount] = useState(500);
  const [paymentOpen, setPaymentOpen] = useState(false);

  if (role === 'guest' || !currentUser) {
    return (
      <main className='min-h-screen bg-[#0d0e11] text-[#f4f0e8]'>
        <LibraryHeader />
        <div className='mx-auto grid min-h-[70vh] max-w-2xl place-items-center px-5 text-center'>
          <div>
            <Icons.lock className='mx-auto text-[#d84a3f]' size={28} />
            <h1 className='mt-6 font-serif text-5xl tracking-[-0.05em]'>登录后查看个人中心</h1>
            <Link href='/login' className='mt-8 inline-flex items-center gap-2 bg-[#d84a3f] px-5 py-3 text-sm font-semibold text-[#130f0f]'>
              登录 / 注册 <Icons.arrowRight size={17} />
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const purchasedScripts = scripts.filter((script) => purchasedIds.includes(script.id));
  const finishPayment = () => {
    recharge(amount);
    setPaymentOpen(false);
    toast.success(`充值成功，已到账 ${(amount * 10).toLocaleString()} 积分`);
  };

  return (
    <main className='min-h-screen bg-[#0d0e11] text-[#f4f0e8]'>
      <LibraryHeader />
      <div className='mx-auto max-w-[1280px] px-5 py-12 sm:px-8 lg:px-12 lg:py-16'>
        <header className='flex flex-col justify-between gap-8 border-b border-white/10 pb-10 sm:flex-row sm:items-end'>
          <div>
            <p className='text-[11px] tracking-[0.24em] text-[#d84a3f] uppercase'>Member account</p>
            <h1 className='mt-3 font-serif text-5xl tracking-[-0.05em] sm:text-6xl'>{currentUser.name}</h1>
            <p className='mt-3 text-sm text-white/38'>{currentUser.email}</p>
          </div>
          <div className='flex gap-10'>
            <div>
              <p className='text-xs text-white/34'>积分余额</p>
              <p className='mt-1 font-serif text-3xl tabular-nums'>{currentUser.points.toLocaleString()}</p>
            </div>
            <div>
              <p className='text-xs text-white/34'>账号折扣</p>
              <p className='mt-1 font-serif text-3xl tabular-nums'>{currentUser.discount / 10} 折</p>
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
                  <Link key={script.id} href={`/scripts/${script.id}`} className='grid grid-cols-[72px_1fr_auto] items-center gap-4 border border-white/10 p-3 transition-colors hover:border-white/24'>
                    <div className='relative aspect-[3/4.2] overflow-hidden'>
                      <Image src={script.image} alt={`${script.title}封面`} fill className='object-cover' sizes='72px' />
                    </div>
                    <div>
                      <p className='font-serif text-xl'>{script.title}</p>
                      <p className='mt-1 text-xs text-white/38'>3 份标准交付文件 · {script.format}</p>
                    </div>
                    <Icons.chevronRight className='text-white/32' size={17} />
                  </Link>
                ))}
              </div>
            ) : (
              <div className='mt-6 border border-dashed border-white/12 p-8 text-center'>
                <p className='text-sm text-white/42'>还没有购买剧本</p>
                <Link href='/scripts' className='mt-4 inline-flex text-sm text-[#df675c]'>去剧本库看看</Link>
              </div>
            )}
          </section>

          <section className='border border-white/12 bg-white/[0.025] p-6 sm:p-8'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-[10px] tracking-[0.2em] text-white/32 uppercase'>Points recharge</p>
                <h2 className='mt-2 font-serif text-3xl'>积分充值</h2>
              </div>
              <Icons.creditCard className='text-[#d84a3f]' size={24} />
            </div>
            <p className='mt-4 text-sm leading-6 text-white/44'>仅支持电脑端支付宝网页支付。1 元兑换 10 积分，充值积分实时到账。</p>
            <div className='mt-7 grid grid-cols-2 gap-3'>
              {rechargeOptions.map((option) => (
                <button
                  key={option}
                  type='button'
                  onClick={() => setAmount(option)}
                  className={`border p-4 text-left transition-colors ${amount === option ? 'border-[#d84a3f] bg-[#d84a3f]/8' : 'border-white/12 hover:border-white/28'}`}
                >
                  <strong className='block font-serif text-2xl'>¥{option}</strong>
                  <span className='mt-1 block text-xs text-white/36'>{(option * 10).toLocaleString()} 积分</span>
                </button>
              ))}
            </div>
            <button type='button' onClick={() => setPaymentOpen(true)} className='mt-6 flex h-12 w-full items-center justify-center gap-2 bg-[#d84a3f] text-sm font-semibold text-[#130f0f]'>
              支付宝充值 ¥{amount} <Icons.arrowRight size={17} />
            </button>
            <p className='mt-3 text-center text-xs text-white/26'>移动设备将在正式版显示电脑端支付提示</p>
          </section>
        </div>
      </div>

      <DemoModal open={paymentOpen} onClose={() => setPaymentOpen(false)} title='支付宝电脑网站支付' eyebrow='Demo payment'>
        <div className='text-sm text-white/58'>
          <div className='grid grid-cols-2 gap-4 border-y border-white/10 py-5'>
            <div><p className='text-xs text-white/32'>支付金额</p><p className='mt-1 font-serif text-3xl text-white'>¥{amount}</p></div>
            <div><p className='text-xs text-white/32'>到账积分</p><p className='mt-1 font-serif text-3xl text-white'>{(amount * 10).toLocaleString()}</p></div>
          </div>
          <div className='mt-5 flex items-start gap-3 bg-white/[0.035] p-4'>
            <Icons.externalLink className='mt-0.5 shrink-0 text-[#d84a3f]' size={17} />
            <p className='leading-6'>正式版将跳转支付宝收银台，支付完成后由服务端异步确认到账。本页面只演示完整交互。</p>
          </div>
          <div className='mt-6 flex gap-3'>
            <button type='button' onClick={() => setPaymentOpen(false)} className='h-11 flex-1 border border-white/14'>取消</button>
            <button type='button' onClick={finishPayment} className='h-11 flex-1 bg-[#d84a3f] font-semibold text-[#130f0f]'>模拟支付成功</button>
          </div>
        </div>
      </DemoModal>
    </main>
  );
}
