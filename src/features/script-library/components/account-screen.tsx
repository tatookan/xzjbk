'use client';

import { Icons } from '@/components/icons';
import type { DemoUser, PointLedgerEntry, RechargePlan } from '@/features/script-library/api/types';
import { LibraryHeader } from '@/features/script-library/components/library-header';
import { useScriptLibraryDemo } from '@/features/script-library/components/demo-context';
import {
  HeartPointAmount,
  HeartPointMark
} from '@/features/script-library/components/heart-point-mark';
import { cn } from '@/lib/utils';
import { authClient } from '@/modules/identity/auth-client';
import Image from 'next/image';
import Link from 'next/link';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';

const sourceLabel: Record<PointLedgerEntry['source'], string> = {
  'admin-adjustment': '管理员调整',
  recharge: '充值到账',
  purchase: '购买剧本',
  refund: '交易退款'
};

export function AccountScreen() {
  const { role, authPending, currentUser, scripts, purchasedIds } = useScriptLibraryDemo();
  const [accountUser, setAccountUser] = useState<DemoUser | null>(null);
  const [ledger, setLedger] = useState<PointLedgerEntry[]>([]);
  const [plans, setPlans] = useState<RechargePlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [accountLoading, setAccountLoading] = useState(true);
  const [accountError, setAccountError] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{
    kind: 'error' | 'success';
    text: string;
  } | null>(null);

  const handlePasswordChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const currentPassword = String(formData.get('currentPassword') ?? '');
    const newPassword = String(formData.get('newPassword') ?? '');
    const confirmPassword = String(formData.get('confirmPassword') ?? '');

    setPasswordMessage(null);
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ kind: 'error', text: '两次输入的新密码不一致' });
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordMessage({ kind: 'error', text: '新密码不能与当前密码相同' });
      return;
    }

    setPasswordSubmitting(true);
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true
      });
      if (result.error) {
        setPasswordMessage({ kind: 'error', text: '当前密码不正确，请重新输入' });
        return;
      }
      form.reset();
      setPasswordMessage({
        kind: 'success',
        text: '密码已更新，其他设备上的登录状态已经退出'
      });
    } catch {
      setPasswordMessage({ kind: 'error', text: '当前无法修改密码，请稍后重试' });
    } finally {
      setPasswordSubmitting(false);
    }
  };

  useEffect(() => {
    if (authPending || role === 'guest') return;
    const controller = new AbortController();
    Promise.all([
      fetch('/api/v1/account', { cache: 'no-store', signal: controller.signal }),
      fetch('/api/v1/recharge-plans', { cache: 'no-store', signal: controller.signal })
    ])
      .then(async ([accountResponse, plansResponse]) => {
        const accountPayload = (await accountResponse.json()) as {
          success: boolean;
          data?: {
            user: DemoUser;
            ledger: PointLedgerEntry[];
            purchasedScriptIds: string[];
          };
          error?: { message?: string };
        };
        const plansPayload = (await plansResponse.json()) as {
          success: boolean;
          data?: { items: RechargePlan[] };
        };
        if (!accountResponse.ok || !accountPayload.success || !accountPayload.data) {
          throw new Error(accountPayload.error?.message ?? '账户读取失败');
        }
        setAccountUser(accountPayload.data.user);
        setLedger(accountPayload.data.ledger);
        if (plansResponse.ok && plansPayload.success && plansPayload.data) {
          setPlans(plansPayload.data.items);
          setSelectedPlanId(plansPayload.data.items[0]?.id ?? '');
        }
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setAccountError(error instanceof Error ? error.message : '账户读取失败');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setAccountLoading(false);
      });
    return () => controller.abort();
  }, [authPending, role]);

  if (authPending) return <main className='min-h-screen bg-[#0d0e11]' />;

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
              className='mt-8 inline-flex items-center gap-2 bg-[#d84a3f] px-5 py-3 text-sm font-semibold text-[#130f0f] active:translate-y-px'
            >
              登录 / 注册 <Icons.arrowRight size={17} />
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const user = accountUser ?? currentUser;
  const purchasedScripts = scripts.filter((script) => purchasedIds.includes(script.id));
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) ?? plans[0];

  return (
    <main className='min-h-screen bg-[#0d0e11] text-[#f4f0e8]'>
      <LibraryHeader />
      <div className='mx-auto max-w-[1280px] px-5 py-12 sm:px-8 lg:px-12 lg:py-16'>
        <header className='flex flex-col justify-between gap-8 border-b border-white/10 pb-10 sm:flex-row sm:items-end'>
          <div>
            <p className='text-[11px] tracking-[0.24em] text-[#d84a3f] uppercase'>Member account</p>
            <h1 className='mt-3 font-serif text-5xl tracking-[-0.05em] sm:text-6xl'>{user.name}</h1>
            <p className='mt-3 text-sm text-white/38'>{user.email}</p>
          </div>
          <div className='grid grid-cols-2 gap-10'>
            <div>
              <p className='flex items-center gap-2 text-xs text-white/34'>
                <HeartPointMark size='xs' /> 心源余额
              </p>
              <HeartPointAmount
                amount={user.points}
                size='md'
                showName={false}
                className='mt-1 font-serif text-3xl'
              />
            </div>
            <div>
              <p className='text-xs text-white/34'>统一兑换</p>
              <div className='mt-1 flex items-center gap-2 font-serif text-3xl tabular-nums'>
                <span>¥1 =</span>
                <HeartPointAmount amount={100} size='md' showName={false} />
              </div>
              <p className='mt-1 text-[10px] text-white/28'>基础心源</p>
            </div>
          </div>
        </header>

        {accountError ? (
          <div className='mt-8 border-l-2 border-[#d84a3f] bg-[#d84a3f]/5 p-4 text-sm text-[#ed8a81]'>
            {accountError}
          </div>
        ) : null}

        <div className='mt-12 grid gap-12 lg:grid-cols-[0.86fr_1.14fr]'>
          <section id='scripts' className='scroll-mt-28'>
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
                  <div
                    key={script.id}
                    className='grid grid-cols-[72px_1fr_auto] items-center gap-4 border border-white/10 p-3 transition-colors hover:border-white/24'
                  >
                    <Link
                      href={`/scripts/${script.id}`}
                      className='relative aspect-[3/4.2] overflow-hidden'
                      aria-label={`查看《${script.title}》详情`}
                    >
                      <Image
                        src={script.image}
                        alt={`${script.title}封面`}
                        fill
                        className='object-cover'
                        sizes='72px'
                      />
                    </Link>
                    <div>
                      <Link
                        href={`/scripts/${script.id}`}
                        className='font-serif text-xl transition-colors hover:text-[#df675c]'
                      >
                        {script.title}
                      </Link>
                      <p className='mt-1 text-xs text-white/38'>完整交付包已解锁</p>
                    </div>
                    <a
                      href={`/api/v1/scripts/${script.id}/files/all`}
                      className='grid size-10 place-items-center border border-white/12 text-white/48 transition-colors hover:border-[#d84a3f] hover:text-[#d84a3f]'
                      aria-label={`下载《${script.title}》全部交付物料`}
                    >
                      <Icons.download size={16} />
                    </a>
                  </div>
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

          <section
            id='recharge'
            className='scroll-mt-28 border border-white/12 bg-white/[0.025] p-6 sm:p-8'
          >
            <div className='flex items-start justify-between gap-4'>
              <div>
                <p className='text-[10px] tracking-[0.2em] text-white/32 uppercase'>Recharge</p>
                <h2 className='mt-2 flex items-center gap-3 font-serif text-3xl'>
                  <HeartPointMark size='md' /> 充值心源
                </h2>
              </div>
              <span className='border border-white/12 px-2.5 py-1 text-[10px] text-white/38'>
                支付待接入
              </span>
            </div>
            <p className='mt-4 max-w-xl text-sm leading-6 text-white/44'>
              基础兑换固定为 1 元 100 心源。档位优惠直接赠送心源，不改变剧本扣费价格。
            </p>

            {accountLoading ? (
              <div className='mt-7 grid grid-cols-2 gap-3' aria-label='正在读取充值档位'>
                {[0, 1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className='h-28 animate-pulse border border-white/10 bg-white/[0.03]'
                  />
                ))}
              </div>
            ) : plans.length ? (
              <div className='mt-7 grid grid-cols-2 gap-3'>
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    type='button'
                    onClick={() => setSelectedPlanId(plan.id)}
                    aria-pressed={selectedPlanId === plan.id}
                    className={cn(
                      'min-h-28 border p-4 text-left transition-colors active:translate-y-px',
                      selectedPlanId === plan.id
                        ? 'border-[#d84a3f] bg-[#d84a3f]/7'
                        : 'border-white/10 hover:border-white/24'
                    )}
                  >
                    <div className='flex items-baseline justify-between gap-3'>
                      <strong className='font-serif text-2xl font-normal'>
                        ¥{plan.amountYuan}
                      </strong>
                      <span className='text-[10px] text-[#df675c]'>
                        约 {plan.effectiveDiscount} 折
                      </span>
                    </div>
                    <HeartPointAmount
                      amount={plan.totalPoints}
                      className='mt-3 text-sm'
                      nameClassName='text-white/38'
                    />
                    <p className='mt-1 text-[10px] text-white/30'>
                      {plan.bonusPoints
                        ? `含赠送 ${plan.bonusPoints.toLocaleString()}`
                        : '基础兑换'}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div className='mt-7 border border-dashed border-white/12 p-8 text-center text-sm text-white/34'>
                暂无可用充值档位
              </div>
            )}

            <div className='mt-6 flex items-center justify-between border-y border-white/10 py-4 text-sm'>
              <span className='text-white/38'>选择到账</span>
              {selectedPlan ? (
                <HeartPointAmount
                  amount={selectedPlan.totalPoints}
                  className='font-mono'
                  nameClassName='font-sans text-white/38'
                />
              ) : (
                <strong className='font-mono font-normal'>未选择</strong>
              )}
            </div>
            <button
              type='button'
              disabled
              className='mt-6 flex h-12 w-full cursor-not-allowed items-center justify-center gap-2 border border-white/10 bg-white/[0.035] text-sm text-white/30'
            >
              支付宝电脑支付暂未开放
            </button>
          </section>
        </div>

        <section className='mt-14 border-t border-white/10 pt-10'>
          <div className='flex items-end justify-between'>
            <div>
              <p className='text-[10px] tracking-[0.2em] text-white/32 uppercase'>
                Balance history
              </p>
              <h2 className='mt-2 font-serif text-3xl'>心源流水</h2>
            </div>
            <span className='text-xs text-white/30'>最近 30 条</span>
          </div>
          {ledger.length ? (
            <div className='mt-6 grid gap-3 md:grid-cols-2'>
              {ledger.map((entry) => (
                <div
                  key={entry.id}
                  className='grid grid-cols-[1fr_auto] items-center gap-4 border border-white/10 p-4'
                >
                  <div>
                    <p className='text-sm'>{sourceLabel[entry.source]}</p>
                    <p className='mt-1 text-xs text-white/30'>
                      {entry.note || new Date(entry.createdAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <div className='text-right'>
                    <HeartPointAmount
                      amount={entry.amount}
                      prefix={entry.direction === 'credit' ? '+' : '-'}
                      size='xs'
                      showName={false}
                      className={cn(
                        'font-mono text-sm',
                        entry.direction === 'credit' ? 'text-[#76c69a]' : 'text-[#ed8a81]'
                      )}
                    />
                    <p className='mt-1 text-[10px] text-white/28'>
                      余额 {entry.balanceAfter.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className='mt-6 border border-dashed border-white/12 px-6 py-12 text-center text-sm text-white/34'>
              暂无心源流水
            </div>
          )}
        </section>

        <section id='security' className='mt-14 scroll-mt-28 border-t border-white/10 pt-10'>
          <div className='grid gap-8 lg:grid-cols-[0.72fr_1.28fr]'>
            <div>
              <p className='text-[10px] tracking-[0.2em] text-white/32 uppercase'>
                Account security
              </p>
              <h2 className='mt-2 font-serif text-3xl'>账户安全</h2>
              <p className='mt-4 max-w-sm text-sm leading-6 text-white/38'>
                修改密码后，当前设备会继续保持登录，其他设备将需要使用新密码重新登录。
              </p>
            </div>
            <form
              onSubmit={handlePasswordChange}
              className='grid gap-5 border border-white/10 bg-white/[0.02] p-6 sm:p-8'
            >
              <label className='grid gap-2 text-sm text-white/62'>
                当前密码
                <input
                  name='currentPassword'
                  type='password'
                  autoComplete='current-password'
                  minLength={8}
                  maxLength={128}
                  required
                  className='h-12 border border-white/14 bg-[#101115] px-4 text-white outline-none transition-colors focus:border-[#d84a3f]'
                />
              </label>
              <div className='grid gap-5 sm:grid-cols-2'>
                <label className='grid gap-2 text-sm text-white/62'>
                  新密码
                  <input
                    name='newPassword'
                    type='password'
                    autoComplete='new-password'
                    minLength={8}
                    maxLength={128}
                    required
                    className='h-12 border border-white/14 bg-[#101115] px-4 text-white outline-none transition-colors focus:border-[#d84a3f]'
                  />
                </label>
                <label className='grid gap-2 text-sm text-white/62'>
                  再次输入新密码
                  <input
                    name='confirmPassword'
                    type='password'
                    autoComplete='new-password'
                    minLength={8}
                    maxLength={128}
                    required
                    className='h-12 border border-white/14 bg-[#101115] px-4 text-white outline-none transition-colors focus:border-[#d84a3f]'
                  />
                </label>
              </div>
              <p className='text-xs leading-5 text-white/34'>密码长度为 8-128 位。</p>
              {passwordMessage ? (
                <p
                  role={passwordMessage.kind === 'error' ? 'alert' : 'status'}
                  className={cn(
                    'flex items-center gap-2 text-sm',
                    passwordMessage.kind === 'success' ? 'text-[#76c69a]' : 'text-[#ff8075]'
                  )}
                >
                  {passwordMessage.kind === 'success' ? (
                    <Icons.circleCheck size={16} />
                  ) : (
                    <Icons.alertCircle size={16} />
                  )}
                  {passwordMessage.text}
                </p>
              ) : null}
              <button
                type='submit'
                disabled={passwordSubmitting}
                className='mt-1 flex h-12 items-center justify-center gap-2 bg-[#d84a3f] px-6 text-sm font-semibold text-[#130f0f] transition-colors hover:bg-[#df5b51] active:translate-y-px disabled:cursor-wait disabled:opacity-55 sm:justify-self-start'
              >
                <Icons.password size={17} stroke={1.6} />
                {passwordSubmitting ? '正在更新密码…' : '更新密码'}
              </button>
            </form>
          </div>
        </section>

        <footer className='mt-14 flex flex-col gap-3 border-t border-white/8 pt-6 text-[11px] text-white/24 sm:flex-row sm:items-center sm:justify-between'>
          <p>心智剧本库会员服务</p>
          <nav className='flex gap-5' aria-label='法律信息'>
            <Link href='/terms' className='transition-colors hover:text-white/52'>
              用户协议
            </Link>
            <Link href='/privacy' className='transition-colors hover:text-white/52'>
              隐私政策
            </Link>
          </nav>
        </footer>
      </div>
    </main>
  );
}
