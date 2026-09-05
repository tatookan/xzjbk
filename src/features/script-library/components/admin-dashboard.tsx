'use client';

import { Icons } from '@/components/icons';
import type { Icon } from '@/components/icons';
import type { DemoScript, DemoUser, RechargePlan } from '@/features/script-library/api/types';
import { DemoModal } from '@/features/script-library/components/demo-modal';
import { useScriptLibraryDemo } from '@/features/script-library/components/demo-context';
import { ScriptUploadFlow } from '@/features/script-library/components/script-upload-flow';
import { ScriptEditor } from '@/features/script-library/components/script-editor';
import { ShowcaseManager } from '@/features/script-library/components/showcase-manager';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type AdminSection =
  | 'overview'
  | 'showcase'
  | 'scripts'
  | 'users'
  | 'invites'
  | 'orders'
  | 'recharges';

interface AdminInvite {
  id: string;
  status: 'unused' | 'used' | 'revoked';
  codeHint: string;
  code?: string;
  createdAt: string;
  usedAt: string | null;
  usedByName: string | null;
  usedByEmail: string | null;
}

const navItems: { id: AdminSection; label: string; icon: Icon }[] = [
  { id: 'overview', label: '经营概览', icon: Icons.dashboard },
  { id: 'showcase', label: '首页海报', icon: Icons.media },
  { id: 'scripts', label: '剧本管理', icon: Icons.post },
  { id: 'users', label: '用户与心源', icon: Icons.teams },
  { id: 'invites', label: '注册码', icon: Icons.lock },
  { id: 'orders', label: '剧本订单', icon: Icons.billing },
  { id: 'recharges', label: '支付预留', icon: Icons.creditCard }
];

const statusStyle = {
  available: 'bg-emerald-500/10 text-emerald-300',
  sold: 'bg-white/8 text-white/48',
  draft: 'bg-amber-500/10 text-amber-300'
};

const statusLabel = { available: '销售中', sold: '已售出', draft: '草稿' };

async function copyInviteCode(code: string) {
  try {
    await navigator.clipboard.writeText(code);
    toast.success('注册码已复制');
  } catch {
    toast.info(`注册码：${code}`);
  }
}

function Metric({
  label,
  value,
  note,
  className
}: {
  label: string;
  value: string;
  note: string;
  className?: string;
}) {
  return (
    <div className={cn('border border-white/10 bg-white/[0.025] p-5', className)}>
      <p className='text-xs text-white/38'>{label}</p>
      <p className='mt-4 font-serif text-4xl tracking-[-0.04em] tabular-nums'>{value}</p>
      <p className='mt-3 text-xs text-white/30'>{note}</p>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  action
}: {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className='mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end'>
      <div>
        <p className='text-[10px] tracking-[0.2em] text-[#d84a3f] uppercase'>{eyebrow}</p>
        <h2 className='mt-2 font-serif text-4xl tracking-[-0.04em]'>{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function AdminDashboard() {
  const {
    role,
    authPending,
    logout,
    currentUser,
    scripts,
    users,
    usersLoading,
    usersError,
    orders,
    adjustPoints,
    deleteScript
  } = useScriptLibraryDemo();
  const [section, setSection] = useState<AdminSection>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<DemoScript | null>(null);
  const [deletingScript, setDeletingScript] = useState<DemoScript | null>(null);
  const [editingUser, setEditingUser] = useState<DemoUser | null>(null);
  const [adjustingUser, setAdjustingUser] = useState(false);
  const [scriptQuery, setScriptQuery] = useState('');
  const [scriptStatus, setScriptStatus] = useState<'all' | DemoScript['status']>('all');
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(true);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [rechargePlans, setRechargePlans] = useState<RechargePlan[]>([]);

  useEffect(() => {
    if (role !== 'admin') return;

    const controller = new AbortController();
    fetch('/api/v1/admin/invite-codes', { signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json()) as {
          success: boolean;
          data?: { items: AdminInvite[] };
        };
        if (response.ok && payload.success && payload.data) {
          setInvites(payload.data.items);
        }
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          toast.error('注册码列表读取失败');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setInvitesLoading(false);
      });

    return () => controller.abort();
  }, [role]);

  useEffect(() => {
    if (role !== 'admin') return;
    const controller = new AbortController();
    fetch('/api/v1/recharge-plans', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json()) as {
          success: boolean;
          data?: { items: RechargePlan[] };
        };
        if (response.ok && payload.success && payload.data) {
          setRechargePlans(payload.data.items);
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [role]);

  if (authPending) {
    return (
      <main className='grid min-h-screen place-items-center bg-[#0c0d10] text-[#f4f0e8]'>
        <div className='h-px w-32 overflow-hidden bg-white/10'>
          <div className='h-full w-1/2 animate-pulse bg-[#d84a3f]' />
        </div>
      </main>
    );
  }

  if (role !== 'admin') {
    return (
      <main className='grid min-h-screen place-items-center bg-[#0c0d10] px-5 text-[#f4f0e8]'>
        <section className='w-full max-w-xl border border-white/12 bg-[#121318] p-8 text-center sm:p-12'>
          <span className='mx-auto grid size-12 place-items-center rounded-full bg-[#d84a3f]/12 text-[#d84a3f]'>
            <Icons.lock size={20} />
          </span>
          <h1 className='mt-6 font-serif text-5xl tracking-[-0.05em]'>管理员后台</h1>
          <p className='mt-4 text-sm leading-7 text-white/46'>
            此区域仅管理员账号可以访问。请使用已经完成初始化的管理员邮箱和密码登录。
          </p>
          <Link
            href='/login'
            className='mt-8 inline-flex items-center gap-2 bg-[#d84a3f] px-5 py-3 text-sm font-semibold text-[#130f0f]'
          >
            登录管理员账号 <Icons.arrowRight size={17} />
          </Link>
          <Link href='/scripts' className='mt-5 block text-sm text-white/38'>
            返回剧本库
          </Link>
        </section>
      </main>
    );
  }

  const activeLabel = navItems.find((item) => item.id === section)?.label;
  const soldCount = scripts.filter((script) => script.status === 'sold').length;
  const availableCount = scripts.filter((script) => script.status === 'available').length;
  const draftCount = scripts.filter((script) => script.status === 'draft').length;
  const filteredScripts = scripts.filter((script) => {
    const keyword = scriptQuery.trim().toLowerCase();
    const matchesKeyword =
      !keyword ||
      script.title.toLowerCase().includes(keyword) ||
      script.englishTitle.toLowerCase().includes(keyword) ||
      script.genre.toLowerCase().includes(keyword);
    return matchesKeyword && (scriptStatus === 'all' || script.status === scriptStatus);
  });

  const handleUserUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingUser) return;
    const data = new FormData(event.currentTarget);
    setAdjustingUser(true);
    const result = await adjustPoints(
      editingUser.id,
      Number(data.get('pointsAdjustment') ?? 0),
      String(data.get('note') ?? '')
    );
    setAdjustingUser(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setEditingUser(null);
    toast.success(result.message);
  };

  const createInvite = async () => {
    setCreatingInvite(true);
    try {
      const response = await fetch('/api/v1/admin/invite-codes', { method: 'POST' });
      const payload = (await response.json()) as {
        success: boolean;
        data?: { invitation: AdminInvite & { code: string } };
        error?: { message?: string };
      };
      if (!response.ok || !payload.success || !payload.data) {
        toast.error(payload.error?.message ?? '注册码生成失败');
        return;
      }
      setInvites((items) => [payload.data!.invitation, ...items]);
      await copyInviteCode(payload.data.invitation.code);
    } catch {
      toast.error('当前无法连接注册码服务');
    } finally {
      setCreatingInvite(false);
    }
  };

  const revokeInvite = async (invite: AdminInvite) => {
    try {
      const response = await fetch(`/api/v1/admin/invite-codes/${invite.id}`, {
        method: 'DELETE'
      });
      const payload = (await response.json()) as {
        success: boolean;
        error?: { message?: string };
      };
      if (!response.ok || !payload.success) {
        toast.error(payload.error?.message ?? '注册码撤销失败');
        return;
      }
      setInvites((items) =>
        items.map((item) =>
          item.id === invite.id ? { ...item, status: 'revoked', code: undefined } : item
        )
      );
      toast.success('注册码已撤销');
    } catch {
      toast.error('当前无法连接注册码服务');
    }
  };

  const confirmScriptDelete = async () => {
    if (!deletingScript) return;
    const result = await deleteScript(deletingScript.id);
    if (result.ok) {
      toast.success(result.message);
      setDeletingScript(null);
    } else {
      toast.error(result.message);
    }
  };

  const renderContent = () => {
    if (section === 'overview') {
      return (
        <>
          <SectionHeading eyebrow='Dashboard' title='经营概览' />
          <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-12'>
            <Metric
              label='销售中剧本'
              value={String(availableCount)}
              note='首页和白名单详情页实时同步'
              className='relative overflow-hidden sm:row-span-2 xl:col-span-5 [&>p:nth-child(2)]:mt-12 [&>p:nth-child(2)]:text-7xl'
            />
            <Metric
              label='待处理草稿'
              value={String(draftCount)}
              note='校对后才能进入前台'
              className='xl:col-span-3'
            />
            <Metric
              label='累计售出'
              value={String(soldCount)}
              note='成交后自动锁定'
              className='xl:col-span-4'
            />
            <Metric
              label='白名单用户'
              value={String(users.filter((user) => user.role === 'member').length)}
              note='注册码一人一码'
              className='xl:col-span-4'
            />
            <Metric
              label='支付接口'
              value='预留'
              note='支付宝暂未接入，不产生支付单'
              className='xl:col-span-3'
            />
          </div>
          <div className='mt-10 grid gap-8 xl:grid-cols-[1.15fr_0.85fr]'>
            <section>
              <SectionHeading
                eyebrow='Recent orders'
                title='最近成交'
                action={
                  <button
                    type='button'
                    onClick={() => setSection('orders')}
                    className='text-xs text-white/46 hover:text-white'
                  >
                    查看全部
                  </button>
                }
              />
              <div className='overflow-hidden border border-white/10'>
                {orders.slice(0, 4).map((order) => (
                  <div
                    key={order.id}
                    className='grid grid-cols-[1fr_auto] gap-5 border-b border-white/8 p-4 last:border-b-0 sm:grid-cols-[1fr_140px_110px]'
                  >
                    <div>
                      <p className='text-sm'>{order.scriptTitle}</p>
                      <p className='mt-1 text-xs text-white/32'>{order.id}</p>
                    </div>
                    <p className='hidden self-center text-sm text-white/48 sm:block'>
                      {order.buyer}
                    </p>
                    <p className='self-center text-right text-sm tabular-nums'>
                      {order.amount.toLocaleString()} 心源
                    </p>
                  </div>
                ))}
              </div>
            </section>
            <section>
              <SectionHeading eyebrow='Operations' title='运营待办' />
              <div className='space-y-3'>
                {[
                  ['scripts', `${draftCount} 部草稿待发布`, '检查资料、试读范围与交付文件'],
                  [
                    'invites',
                    `${invites.filter((invite) => invite.status === 'unused').length} 个注册码可用`,
                    '按需生成，一人一码'
                  ],
                  ['recharges', '支付宝接口已预留', '暂不开放充值，不产生模拟订单'],
                  [
                    'users',
                    `${users.filter((user) => user.role === 'member' && user.points < 3000).length} 位用户心源偏低`,
                    '可查看余额并按需人工调整，所有变动记录流水'
                  ]
                ].map(([target, title, text], index) => (
                  <button
                    key={title}
                    type='button'
                    onClick={() => setSection(target as AdminSection)}
                    className='flex w-full gap-4 border border-white/10 p-4 text-left transition-colors hover:border-white/22 hover:bg-white/[0.02]'
                  >
                    <span className='font-mono text-xs text-[#d84a3f]'>0{index + 1}</span>
                    <div className='min-w-0 flex-1'>
                      <p className='text-sm'>{title}</p>
                      <p className='mt-1 text-xs leading-5 text-white/36'>{text}</p>
                    </div>
                    <Icons.chevronRight className='mt-1 text-white/24' size={15} />
                  </button>
                ))}
              </div>
            </section>
          </div>
        </>
      );
    }

    if (section === 'showcase') {
      return <ShowcaseManager />;
    }

    if (section === 'scripts') {
      return (
        <>
          <SectionHeading
            eyebrow='Content inventory'
            title='剧本管理'
            action={
              <button
                type='button'
                onClick={() => setUploadOpen(true)}
                className='inline-flex h-10 items-center gap-2 bg-[#d84a3f] px-4 text-sm font-semibold text-[#130f0f]'
              >
                <Icons.add size={16} /> 上传剧本
              </button>
            }
          />
          <div className='mb-5 flex flex-col justify-between gap-3 border-y border-white/10 py-4 sm:flex-row sm:items-center'>
            <div className='relative min-w-0 sm:w-72'>
              <Icons.search
                className='absolute top-1/2 left-3 -translate-y-1/2 text-white/28'
                size={15}
              />
              <input
                value={scriptQuery}
                onChange={(event) => setScriptQuery(event.target.value)}
                placeholder='搜索剧名、英文名或题材'
                aria-label='搜索后台剧本'
                className='h-10 w-full border border-white/10 bg-white/[0.025] pr-3 pl-9 text-xs text-white outline-none placeholder:text-white/24 focus:border-[#d84a3f]'
              />
            </div>
            <div className='flex items-center gap-3'>
              <span className='text-xs text-white/28'>{filteredScripts.length} 个项目</span>
              <select
                value={scriptStatus}
                onChange={(event) =>
                  setScriptStatus(event.target.value as 'all' | DemoScript['status'])
                }
                aria-label='按状态筛选剧本'
                className='h-10 border border-white/10 bg-[#15161a] px-3 text-xs text-white/62 outline-none focus:border-[#d84a3f]'
              >
                <option value='all'>全部状态</option>
                <option value='draft'>草稿</option>
                <option value='available'>销售中</option>
                <option value='sold'>已售出</option>
              </select>
            </div>
          </div>
          <div className='overflow-x-auto border border-white/10'>
            <table className='w-full min-w-[980px] text-left text-sm'>
              <thead className='border-b border-white/10 bg-white/[0.025] text-xs text-white/34'>
                <tr>
                  <th className='px-5 py-4 font-normal'>剧本</th>
                  <th className='px-5 py-4 font-normal'>内容形态</th>
                  <th className='px-5 py-4 font-normal'>试读开放</th>
                  <th className='px-5 py-4 font-normal'>价格</th>
                  <th className='px-5 py-4 font-normal'>状态</th>
                  <th className='px-5 py-4 text-right font-normal'>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredScripts.map((script) => (
                  <tr
                    key={script.id}
                    className='border-b border-white/8 transition-colors last:border-b-0 hover:bg-white/[0.018]'
                  >
                    <td className='px-5 py-4' aria-label={`剧本：${script.title}`}>
                      <div className='flex items-center gap-3'>
                        <div className='relative h-14 w-10 shrink-0 overflow-hidden bg-white/5'>
                          <Image
                            src={script.image}
                            alt={`${script.title}封面`}
                            fill
                            className='object-cover'
                            sizes='40px'
                          />
                        </div>
                        <div>
                          <p>{script.title}</p>
                          <p className='mt-1 max-w-64 truncate text-xs text-white/30'>
                            {script.englishTitle}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className='px-5 py-4'>
                      <p className='text-white/62'>
                        {script.genre} · {script.presentationMode}
                      </p>
                      <p className='mt-1 text-[10px] text-white/28'>{script.format}</p>
                    </td>
                    <td className='px-5 py-4'>
                      <p className='font-mono text-xs text-white/64'>
                        {script.previewUnitLabel === '场'
                          ? `${script.previewUnitCount ?? 0} 场`
                          : `${script.previewVisibleCount ?? script.preview.length} 段`}
                      </p>
                      <p className='mt-1 text-[10px] text-white/28'>白名单可读</p>
                    </td>
                    <td className='px-5 py-4 tabular-nums'>{script.price.toLocaleString()}</td>
                    <td className='px-5 py-4'>
                      <span
                        className={cn(
                          'inline-flex px-2.5 py-1 text-xs',
                          statusStyle[script.status]
                        )}
                      >
                        {statusLabel[script.status]}
                      </span>
                    </td>
                    <td className='px-5 py-4 text-right' aria-label={`${script.title}操作`}>
                      <div className='flex items-center justify-end gap-4'>
                        <Link
                          href={`/scripts/${script.id}`}
                          className='inline-flex items-center gap-1 text-xs text-white/40 hover:text-white'
                        >
                          预览 <Icons.externalLink size={13} />
                        </Link>
                        <button
                          type='button'
                          onClick={() => setEditingScript(script)}
                          className='inline-flex items-center gap-1 text-xs text-[#df675c] hover:text-[#ec7c72]'
                        >
                          {script.status === 'sold' ? (
                            <Icons.lock size={13} />
                          ) : (
                            <Icons.edit size={13} />
                          )}
                          {script.status === 'sold' ? '成交档案' : '编辑'}
                        </button>
                        {script.status !== 'sold' ? (
                          <button
                            type='button'
                            onClick={() => setDeletingScript(script)}
                            className='inline-flex items-center gap-1 text-xs text-white/28 transition-colors hover:text-[#df675c]'
                          >
                            <Icons.trash size={13} /> 删除
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {!filteredScripts.length ? (
                  <tr>
                    <td colSpan={6} className='px-5 py-16 text-center text-sm text-white/32'>
                      没有符合条件的剧本
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </>
      );
    }

    if (section === 'users') {
      return (
        <>
          <SectionHeading eyebrow='Members' title='用户与心源' />
          <div className='overflow-x-auto border border-white/10'>
            <table className='w-full min-w-[720px] text-left text-sm'>
              <thead className='border-b border-white/10 bg-white/[0.025] text-xs text-white/34'>
                <tr>
                  <th className='px-5 py-4 font-normal'>用户</th>
                  <th className='px-5 py-4 font-normal'>角色</th>
                  <th className='px-5 py-4 font-normal'>心源余额</th>
                  <th className='px-5 py-4 font-normal'>计价规则</th>
                  <th className='px-5 py-4 text-right font-normal'>操作</th>
                </tr>
              </thead>
              <tbody>
                {usersLoading ? (
                  <tr>
                    <td colSpan={5} className='px-5 py-12' aria-label='正在读取用户账户'>
                      <div className='h-12 animate-pulse bg-white/[0.035]' />
                    </td>
                  </tr>
                ) : null}
                {users.map((user) => (
                  <tr key={user.id} className='border-b border-white/8 last:border-b-0'>
                    <td className='px-5 py-4'>
                      <p>{user.name}</p>
                      <p className='mt-1 text-xs text-white/30'>{user.email}</p>
                    </td>
                    <td className='px-5 py-4 text-white/48'>
                      {user.role === 'admin' ? '管理员' : '白名单用户'}
                    </td>
                    <td className='px-5 py-4 font-mono text-xs tabular-nums'>
                      {user.points.toLocaleString()}
                    </td>
                    <td className='px-5 py-4 text-xs text-white/42'>统一价格</td>
                    <td className='px-5 py-4 text-right'>
                      {user.role === 'member' ? (
                        <button
                          type='button'
                          onClick={() => setEditingUser(user)}
                          className='inline-flex items-center gap-1 text-xs text-[#df675c]'
                        >
                          <Icons.edit size={14} /> 调整
                        </button>
                      ) : (
                        <span className='text-xs text-white/24'>不可调整</span>
                      )}
                    </td>
                  </tr>
                ))}
                {!usersLoading && !users.length ? (
                  <tr>
                    <td colSpan={5} className='px-5 py-14 text-center text-sm text-white/34'>
                      {usersError || '还没有用户账户'}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </>
      );
    }

    if (section === 'invites') {
      return (
        <>
          <SectionHeading
            eyebrow='Whitelist access'
            title='注册码管理'
            action={
              <button
                type='button'
                onClick={createInvite}
                disabled={creatingInvite}
                className='inline-flex h-10 items-center gap-2 bg-[#d84a3f] px-4 text-sm font-semibold text-[#130f0f] disabled:cursor-wait disabled:opacity-55'
              >
                <Icons.add size={16} /> {creatingInvite ? '正在生成…' : '生成注册码'}
              </button>
            }
          />
          <div className='mb-6 max-w-2xl border-l-2 border-[#d84a3f] bg-white/[0.025] p-4 text-sm leading-6 text-white/46'>
            每个注册码只能注册一个账号。完整代码仅在生成时显示并自动复制；刷新后只保留末六位，避免后台历史页面泄露有效注册码。
          </div>
          {invitesLoading ? (
            <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3' aria-label='正在读取注册码'>
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className='h-40 animate-pulse border border-white/10 bg-white/[0.025]'
                />
              ))}
            </div>
          ) : invites.length ? (
            <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
              {invites.map((invite) => (
                <div key={invite.id} className='border border-white/10 p-5'>
                  <div className='flex items-start justify-between gap-4'>
                    <code className='text-base tracking-[0.06em] break-all'>
                      {invite.code ?? `XINZHI-${invite.codeHint}`}
                    </code>
                    <span
                      className={cn(
                        'px-2 py-1 text-[10px]',
                        invite.status === 'unused'
                          ? 'bg-emerald-500/10 text-emerald-300'
                          : invite.status === 'used'
                            ? 'bg-white/8 text-white/36'
                            : 'bg-red-500/10 text-red-300'
                      )}
                    >
                      {invite.status === 'unused'
                        ? '未使用'
                        : invite.status === 'used'
                          ? '已使用'
                          : '已撤销'}
                    </span>
                  </div>
                  <p className='mt-5 text-xs text-white/30'>
                    生成于 {new Date(invite.createdAt).toLocaleString('zh-CN')}
                  </p>
                  {invite.usedByName ? (
                    <p className='mt-1 text-xs text-white/30'>
                      使用人 {invite.usedByName} · {invite.usedByEmail}
                    </p>
                  ) : null}
                  <div className='mt-5 flex items-center gap-5'>
                    <button
                      type='button'
                      disabled={!invite.code || invite.status !== 'unused'}
                      onClick={() => invite.code && copyInviteCode(invite.code)}
                      className='inline-flex items-center gap-2 text-xs text-white/52 disabled:cursor-not-allowed disabled:text-white/20'
                    >
                      <Icons.page size={14} /> {invite.code ? '复制注册码' : '完整代码不再回显'}
                    </button>
                    {invite.status === 'unused' ? (
                      <button
                        type='button'
                        onClick={() => revokeInvite(invite)}
                        className='text-xs text-[#ff8075]/72 hover:text-[#ff8075]'
                      >
                        撤销
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className='border border-dashed border-white/12 px-6 py-16 text-center text-sm text-white/34'>
              还没有注册码。生成后会自动复制到剪贴板。
            </div>
          )}
        </>
      );
    }

    if (section === 'orders') {
      return (
        <>
          <SectionHeading eyebrow='Exclusive sales' title='剧本订单' />
          <div className='overflow-x-auto border border-white/10'>
            <table className='w-full min-w-[760px] text-left text-sm'>
              <thead className='border-b border-white/10 bg-white/[0.025] text-xs text-white/34'>
                <tr>
                  <th className='px-5 py-4 font-normal'>订单号</th>
                  <th className='px-5 py-4 font-normal'>剧本</th>
                  <th className='px-5 py-4 font-normal'>购买人</th>
                  <th className='px-5 py-4 font-normal'>成交心源</th>
                  <th className='px-5 py-4 font-normal'>时间</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className='border-b border-white/8 last:border-b-0'>
                    <td className='px-5 py-4 font-mono text-xs text-white/36'>{order.id}</td>
                    <td className='px-5 py-4'>{order.scriptTitle}</td>
                    <td className='px-5 py-4 text-white/52'>{order.buyer}</td>
                    <td className='px-5 py-4 tabular-nums'>{order.amount.toLocaleString()}</td>
                    <td className='px-5 py-4 text-xs text-white/34'>{order.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      );
    }

    return (
      <>
        <SectionHeading eyebrow='Recharge policy' title='充值档位与支付预留' />
        <div className='grid gap-5 lg:grid-cols-[1.1fr_0.9fr]'>
          <section className='border border-white/10 bg-white/[0.025] p-6 sm:p-8'>
            <div className='flex items-start justify-between gap-6'>
              <div>
                <span className='inline-flex bg-white/8 px-2.5 py-1 text-[10px] text-white/44'>
                  暂未接入
                </span>
                <h3 className='mt-5 font-serif text-3xl'>支付宝电脑网站支付</h3>
                <p className='mt-4 max-w-xl text-sm leading-7 text-white/42'>
                  当前不会创建充值订单，也不会出现模拟到账。基础兑换固定为 1 元 100
                  心源，优惠全部通过档位赠送实现。
                </p>
              </div>
              <Icons.creditCard className='shrink-0 text-[#d84a3f]' size={26} />
            </div>
          </section>
          <section className='border border-white/10 p-6 sm:p-8'>
            <p className='text-xs text-white/34'>当前充值档位</p>
            {rechargePlans.length ? (
              <div className='mt-5 grid grid-cols-2 gap-3'>
                {rechargePlans.map((plan) => (
                  <div key={plan.id} className='border border-white/10 p-4'>
                    <div className='flex items-baseline justify-between gap-3'>
                      <strong className='font-serif text-xl font-normal'>¥{plan.amountYuan}</strong>
                      <span className='text-[10px] text-[#df675c]'>
                        {plan.effectiveDiscount} 折
                      </span>
                    </div>
                    <p className='mt-2 font-mono text-xs tabular-nums'>
                      {plan.totalPoints.toLocaleString()} 心源
                    </p>
                    <p className='mt-1 text-[10px] text-white/28'>
                      赠送 {plan.bonusPoints.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className='mt-5 border border-dashed border-white/12 p-8 text-center text-xs text-white/32'>
                正在读取充值档位
              </div>
            )}
            <p className='mt-5 text-xs leading-5 text-white/30'>
              数据库会拒绝低于 4 折的档位配置。支付接入后，回调只按下单时保存的档位快照入账。
            </p>
          </section>
        </div>
      </>
    );
  };

  return (
    <main className='min-h-screen bg-[#0c0d10] text-[#f4f0e8] lg:grid lg:grid-cols-[240px_1fr]'>
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 border-r border-white/10 bg-[#101115] p-5 transition-transform lg:sticky lg:top-0 lg:h-screen lg:w-auto lg:translate-x-0',
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className='flex items-center justify-between'>
          <Link href='/' className='flex items-center gap-3'>
            <span className='grid size-9 place-items-center border border-white/65 text-[11px] font-semibold tracking-[-0.08em]'>
              心智
            </span>
            <span className='text-[10px] tracking-[0.18em] text-white/36'>ADMIN</span>
          </Link>
          <button
            type='button'
            onClick={() => setMobileNavOpen(false)}
            className='grid size-9 place-items-center text-white/42 lg:hidden'
            aria-label='关闭导航'
          >
            <Icons.close size={18} />
          </button>
        </div>
        <nav className='mt-12 space-y-1'>
          {navItems.map((item) => {
            const ItemIcon = item.icon;
            return (
              <button
                key={item.id}
                type='button'
                onClick={() => {
                  setSection(item.id);
                  setMobileNavOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-3 px-3 py-3 text-left text-sm transition-colors',
                  section === item.id
                    ? 'bg-white/8 text-white'
                    : 'text-white/42 hover:bg-white/[0.035] hover:text-white/72'
                )}
              >
                <ItemIcon size={17} />
                <span>{item.label}</span>
                {section === item.id ? (
                  <span className='ml-auto size-1.5 rounded-full bg-[#d84a3f]' />
                ) : null}
              </button>
            );
          })}
        </nav>
        <div className='absolute right-5 bottom-6 left-5 space-y-2 border-t border-white/10 pt-5'>
          <Link
            href='/scripts'
            className='flex items-center gap-3 px-3 py-2 text-xs text-white/42 hover:text-white'
          >
            <Icons.externalLink size={15} />
            查看前台剧本库
          </Link>
          <button
            type='button'
            onClick={logout}
            className='flex w-full items-center gap-3 px-3 py-2 text-xs text-white/42 hover:text-white'
          >
            <Icons.logout size={15} />
            退出管理员账号
          </button>
        </div>
      </aside>
      {mobileNavOpen ? (
        <button
          type='button'
          className='fixed inset-0 z-40 bg-black/60 lg:hidden'
          onClick={() => setMobileNavOpen(false)}
          aria-label='关闭导航遮罩'
        />
      ) : null}

      <div className='min-w-0'>
        <header className='sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-[#0c0d10]/90 px-5 backdrop-blur-lg sm:px-8 lg:px-10'>
          <div className='flex items-center gap-3'>
            <button
              type='button'
              onClick={() => setMobileNavOpen(true)}
              className='grid size-9 place-items-center border border-white/10 lg:hidden'
              aria-label='打开导航'
            >
              <Icons.menu size={18} />
            </button>
            <p className='text-sm text-white/60'>{activeLabel}</p>
          </div>
          <div className='flex items-center gap-3 text-xs text-white/42'>
            <span className='size-2 rounded-full bg-emerald-400' />
            <span>管理员 · {currentUser?.name ?? '心智管理员'}</span>
          </div>
        </header>
        <div className='p-5 sm:p-8 lg:p-10 xl:p-12'>{renderContent()}</div>
      </div>

      <ScriptUploadFlow open={uploadOpen} onClose={() => setUploadOpen(false)} />

      {editingScript ? (
        <ScriptEditor
          key={editingScript.id}
          script={editingScript}
          onClose={() => setEditingScript(null)}
        />
      ) : null}

      <DemoModal
        open={Boolean(deletingScript)}
        onClose={() => setDeletingScript(null)}
        title={deletingScript ? `删除《${deletingScript.title}》` : '删除剧本'}
        eyebrow='Delete script'
      >
        {deletingScript ? (
          <div>
            <div className='border-l-2 border-[#d84a3f] bg-[#d84a3f]/5 p-5'>
              <p className='flex items-center gap-2 text-sm text-white/78'>
                <Icons.warning size={17} className='text-[#d84a3f]' /> 确认删除这个剧本？
              </p>
              <p className='mt-3 text-xs leading-6 text-white/38'>
                删除后，首页卡片、详情页、白名单试读和交付文件记录都会从当前项目中移除。该操作不能撤销。
              </p>
            </div>
            <div className='mt-6 flex justify-end gap-3'>
              <button
                type='button'
                onClick={() => setDeletingScript(null)}
                className='h-11 px-5 text-sm text-white/42 transition-colors hover:text-white'
              >
                取消
              </button>
              <button
                type='button'
                onClick={() => void confirmScriptDelete()}
                className='inline-flex h-11 items-center gap-2 border border-[#d84a3f]/70 bg-[#d84a3f]/10 px-5 text-sm text-[#ec7c72] transition-colors hover:bg-[#d84a3f]/18 active:translate-y-px'
              >
                <Icons.trash size={15} /> 确认删除
              </button>
            </div>
          </div>
        ) : null}
      </DemoModal>

      <DemoModal
        open={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        title={editingUser ? `调整 ${editingUser.name}` : '调整用户'}
        eyebrow='Account controls'
      >
        {editingUser ? (
          <form onSubmit={handleUserUpdate} className='space-y-5'>
            <div className='border-y border-white/10 py-4 text-sm'>
              <div>
                <p className='text-xs text-white/32'>当前心源</p>
                <p className='mt-1 font-serif text-2xl'>{editingUser.points.toLocaleString()}</p>
              </div>
            </div>
            <label className='block text-sm text-white/56'>
              心源增减
              <input
                name='pointsAdjustment'
                type='number'
                defaultValue='0'
                className='mt-2 h-11 w-full border border-white/14 bg-white/[0.035] px-3 text-white outline-none focus:border-[#d84a3f]'
              />
              <span className='mt-1 block text-xs text-white/28'>输入正数增加，负数减少</span>
            </label>
            <label className='block text-sm text-white/56'>
              调整原因
              <input
                name='note'
                required
                minLength={2}
                maxLength={300}
                placeholder='例如：线下收款补录、活动奖励或纠错'
                className='mt-2 h-11 w-full border border-white/14 bg-white/[0.035] px-3 text-white outline-none placeholder:text-white/24 focus:border-[#d84a3f]'
              />
              <span className='mt-1 block text-xs text-white/28'>原因会写入账户流水和审计记录</span>
            </label>
            <div className='flex gap-3 pt-2'>
              <button
                type='button'
                onClick={() => setEditingUser(null)}
                className='h-11 flex-1 border border-white/14'
              >
                取消
              </button>
              <button
                type='submit'
                disabled={adjustingUser}
                className='h-11 flex-1 bg-[#d84a3f] font-semibold text-[#130f0f] disabled:cursor-wait disabled:opacity-55'
              >
                {adjustingUser ? '正在保存…' : '保存调整'}
              </button>
            </div>
          </form>
        ) : null}
      </DemoModal>
    </main>
  );
}
