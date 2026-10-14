'use client';

import { Icons } from '@/components/icons';
import type {
  AgentAccessUserDto,
  AgentApiKeyDto,
  AgentImportDto
} from '@/modules/agent-access/contracts';
import { AGENT_SKILL_DOWNLOAD_PATH, AGENT_SKILL_VERSION } from '@/modules/agent-access/version';
import { cn } from '@/lib/utils';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface AgentAdminData {
  users: AgentAccessUserDto[];
  keys: AgentApiKeyDto[];
  imports: AgentImportDto[];
}

interface IssuedKey {
  ownerName: string;
  connection: {
    server: string;
    apiVersion: string;
    skillVersion: string;
    apiKey: string;
  };
}

const emptyData: AgentAdminData = { users: [], keys: [], imports: [] };

export function AgentManager() {
  const [data, setData] = useState<AgentAdminData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState('');
  const [keyUserId, setKeyUserId] = useState('');
  const [keyName, setKeyName] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(90);
  const [issuedKey, setIssuedKey] = useState<IssuedKey | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/admin/agent', { cache: 'no-store' });
      const payload = (await response.json()) as {
        success: boolean;
        data?: AgentAdminData;
        error?: { message?: string };
      };
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error?.message ?? 'Agent管理数据读取失败');
      }
      setData(payload.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Agent管理数据读取失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/v1/admin/agent', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json()) as {
          success: boolean;
          data?: AgentAdminData;
          error?: { message?: string };
        };
        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.error?.message ?? 'Agent管理数据读取失败');
        }
        if (!controller.signal.aborted) setData(payload.data);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          toast.error(error instanceof Error ? error.message : 'Agent管理数据读取失败');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const enabledUsers = useMemo(() => data.users.filter((user) => user.enabled), [data.users]);
  const activeKeys = useMemo(
    () => data.keys.filter((key) => key.status === 'active' && !key.expired),
    [data.keys]
  );

  const setAccess = async (user: AgentAccessUserDto, enabled: boolean) => {
    setWorkingId(`access:${user.id}`);
    try {
      const response = await fetch(`/api/v1/admin/agent/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      const payload = (await response.json()) as {
        success: boolean;
        error?: { message?: string };
      };
      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message ?? 'Agent权限更新失败');
      }
      toast.success(enabled ? `已为 ${user.name} 开通 Agent` : `已关闭 ${user.name} 的 Agent权限`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Agent权限更新失败');
    } finally {
      setWorkingId('');
    }
  };

  const createKey = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!keyUserId) return;
    setWorkingId('create-key');
    try {
      const response = await fetch('/api/v1/admin/agent/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerUserId: keyUserId, name: keyName, expiresInDays })
      });
      const payload = (await response.json()) as {
        success: boolean;
        data?: { connection: IssuedKey['connection'] };
        error?: { message?: string };
      };
      if (!response.ok || !payload.success || !payload.data) {
        throw new Error(payload.error?.message ?? 'Key创建失败');
      }
      const owner = data.users.find((user) => user.id === keyUserId);
      setIssuedKey({ ownerName: owner?.name ?? '用户', connection: payload.data.connection });
      setKeyUserId('');
      setKeyName('');
      toast.success('Key已创建，仅本次显示完整内容');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Key创建失败');
    } finally {
      setWorkingId('');
    }
  };

  const revokeKey = async (key: AgentApiKeyDto) => {
    setWorkingId(`key:${key.id}`);
    try {
      const response = await fetch(`/api/v1/admin/agent/keys/${key.id}`, { method: 'DELETE' });
      const payload = (await response.json()) as {
        success: boolean;
        error?: { message?: string };
      };
      if (!response.ok || !payload.success) {
        throw new Error(payload.error?.message ?? 'Key撤销失败');
      }
      toast.success('Key已立即撤销');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Key撤销失败');
    } finally {
      setWorkingId('');
    }
  };

  const copyConnection = async () => {
    if (!issuedKey) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(issuedKey.connection, null, 2));
      toast.success('连接配置已复制，请通过安全方式交给对应用户');
    } catch {
      toast.error('复制失败，请手动选择连接配置');
    }
  };

  if (loading) {
    return (
      <div className='grid gap-4' aria-label='正在读取Agent管理数据'>
        <div className='h-36 animate-pulse bg-white/[0.035]' />
        <div className='h-72 animate-pulse bg-white/[0.025]' />
      </div>
    );
  }

  return (
    <div>
      <div className='mb-8 flex flex-col justify-between gap-5 border-b border-white/10 pb-7 xl:flex-row xl:items-end'>
        <div>
          <p className='text-[10px] tracking-[0.2em] text-[#d84a3f] uppercase'>Agent access</p>
          <h2 className='mt-2 font-serif text-4xl tracking-[-0.04em]'>Agent 接入管理</h2>
          <p className='mt-4 max-w-2xl text-sm leading-7 text-white/42'>
            为指定用户开通灰度资格并签发专属Key。Agent只能提交待审核草稿，无法发布、定价或操作用户资产。
          </p>
        </div>
        <a
          href={`${AGENT_SKILL_DOWNLOAD_PATH}?v=${AGENT_SKILL_VERSION}`}
          download
          className='inline-flex h-10 items-center gap-2 border border-white/14 px-4 text-sm whitespace-nowrap text-white/62 transition-colors hover:border-white/30 hover:text-white'
        >
          <Icons.download size={15} /> 下载官方 Skill
        </a>
      </div>

      <div className='grid gap-3 sm:grid-cols-3'>
        {[
          ['已开通用户', enabledUsers.length],
          ['有效Key', activeKeys.length],
          ['待审核导入', data.imports.filter((item) => item.status === 'committed').length]
        ].map(([label, value]) => (
          <div key={label} className='border border-white/10 bg-white/[0.025] p-5'>
            <p className='text-xs text-white/36'>{label}</p>
            <p className='mt-4 font-serif text-4xl tabular-nums'>{value}</p>
          </div>
        ))}
      </div>

      <section className='mt-10'>
        <div className='mb-5 flex items-end justify-between gap-5'>
          <div>
            <h3 className='font-serif text-3xl'>接入用户</h3>
            <p className='mt-2 text-xs text-white/32'>关闭资格会立即撤销该用户的全部有效Key。</p>
          </div>
          <button
            type='button'
            onClick={() => void load()}
            className='inline-flex items-center gap-2 text-xs text-white/42 hover:text-white'
          >
            <Icons.refresh size={14} /> 刷新
          </button>
        </div>
        <div className='overflow-x-auto border border-white/10'>
          <table className='w-full min-w-[760px] text-left text-sm'>
            <thead className='border-b border-white/10 bg-white/[0.025] text-xs text-white/34'>
              <tr>
                <th className='px-5 py-4 font-normal'>用户</th>
                <th className='px-5 py-4 font-normal'>状态</th>
                <th className='px-5 py-4 font-normal'>有效Key</th>
                <th className='px-5 py-4 text-right font-normal'>操作</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((user) => (
                <tr key={user.id} className='border-b border-white/8 last:border-b-0'>
                  <td className='px-5 py-4'>
                    <p>{user.name}</p>
                    <p className='mt-1 text-xs text-white/30'>{user.email}</p>
                  </td>
                  <td className='px-5 py-4'>
                    <span
                      className={cn(
                        'inline-flex px-2.5 py-1 text-xs',
                        user.enabled
                          ? 'bg-emerald-500/10 text-emerald-300'
                          : 'bg-white/7 text-white/34'
                      )}
                    >
                      {user.enabled ? '已开通' : '未开通'}
                    </span>
                  </td>
                  <td className='px-5 py-4 font-mono text-xs tabular-nums text-white/54'>
                    {user.activeKeyCount}
                  </td>
                  <td className='px-5 py-4 text-right'>
                    <div className='flex justify-end gap-4'>
                      {user.enabled ? (
                        <button
                          type='button'
                          onClick={() => {
                            setKeyUserId(user.id);
                            setKeyName(`${user.name} 的 Agent`);
                          }}
                          className='inline-flex items-center gap-1 text-xs text-[#df675c]'
                        >
                          <Icons.key size={14} /> 创建Key
                        </button>
                      ) : null}
                      <button
                        type='button'
                        disabled={workingId === `access:${user.id}`}
                        onClick={() => void setAccess(user, !user.enabled)}
                        className='text-xs text-white/38 transition-colors hover:text-white disabled:opacity-40'
                      >
                        {workingId === `access:${user.id}`
                          ? '处理中'
                          : user.enabled
                            ? '关闭资格'
                            : '开通灰度'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!data.users.length ? (
                <tr>
                  <td colSpan={4} className='px-5 py-14 text-center text-sm text-white/32'>
                    还没有可授权用户
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {keyUserId ? (
        <section className='mt-8 border border-[#d84a3f]/30 bg-[#d84a3f]/[0.035] p-5 sm:p-6'>
          <form
            onSubmit={createKey}
            className='grid gap-5 lg:grid-cols-[1fr_180px_auto] lg:items-end'
          >
            <label className='text-sm text-white/58'>
              Key名称
              <input
                value={keyName}
                onChange={(event) => setKeyName(event.target.value)}
                required
                minLength={2}
                maxLength={80}
                className='mt-2 h-11 w-full border border-white/14 bg-[#101115] px-3 text-white outline-none focus:border-[#d84a3f]'
              />
            </label>
            <label className='text-sm text-white/58'>
              有效期
              <select
                value={expiresInDays}
                onChange={(event) => setExpiresInDays(Number(event.target.value))}
                className='mt-2 h-11 w-full border border-white/14 bg-[#101115] px-3 text-white outline-none focus:border-[#d84a3f]'
              >
                <option value={30}>30天</option>
                <option value={90}>90天</option>
                <option value={180}>180天</option>
                <option value={365}>365天</option>
              </select>
            </label>
            <div className='flex gap-3'>
              <button
                type='button'
                onClick={() => setKeyUserId('')}
                className='h-11 px-4 text-sm text-white/42 hover:text-white'
              >
                取消
              </button>
              <button
                type='submit'
                disabled={workingId === 'create-key'}
                className='h-11 bg-[#d84a3f] px-5 text-sm font-semibold whitespace-nowrap text-[#130f0f] disabled:opacity-50'
              >
                {workingId === 'create-key' ? '正在创建' : '确认创建'}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {issuedKey ? (
        <section className='mt-8 border border-emerald-400/25 bg-emerald-400/[0.035] p-5 sm:p-6'>
          <div className='flex flex-col justify-between gap-4 sm:flex-row sm:items-start'>
            <div>
              <p className='text-sm text-emerald-300'>{issuedKey.ownerName} 的连接配置已生成</p>
              <p className='mt-2 text-xs leading-6 text-white/38'>
                完整Key仅本次显示。请复制后通过安全方式交给对应用户，关闭后无法再次查看。
              </p>
            </div>
            <button
              type='button'
              onClick={() => setIssuedKey(null)}
              aria-label='关闭连接配置'
              className='text-white/36 hover:text-white'
            >
              <Icons.close size={18} />
            </button>
          </div>
          <pre className='mt-5 max-h-72 overflow-auto bg-[#090a0c] p-4 font-mono text-xs leading-6 text-white/72'>
            <code>{JSON.stringify(issuedKey.connection, null, 2)}</code>
          </pre>
          <button
            type='button'
            onClick={copyConnection}
            className='mt-4 inline-flex h-10 items-center gap-2 bg-emerald-300 px-4 text-sm font-semibold text-[#102119]'
          >
            <Icons.page size={15} /> 复制连接配置
          </button>
        </section>
      ) : null}

      <section className='mt-12'>
        <h3 className='font-serif text-3xl'>API Key</h3>
        <div className='mt-5 overflow-x-auto border border-white/10'>
          <table className='w-full min-w-[900px] text-left text-sm'>
            <thead className='border-b border-white/10 bg-white/[0.025] text-xs text-white/34'>
              <tr>
                <th className='px-5 py-4 font-normal'>Key</th>
                <th className='px-5 py-4 font-normal'>所属用户</th>
                <th className='px-5 py-4 font-normal'>有效期</th>
                <th className='px-5 py-4 font-normal'>最近使用</th>
                <th className='px-5 py-4 font-normal'>状态</th>
                <th className='px-5 py-4 text-right font-normal'>操作</th>
              </tr>
            </thead>
            <tbody>
              {data.keys.map((key) => {
                const expired = key.expired;
                return (
                  <tr key={key.id} className='border-b border-white/8 last:border-b-0'>
                    <td className='px-5 py-4'>
                      <p>{key.name}</p>
                      <code className='mt-1 block text-xs text-white/30'>{key.keyHint}</code>
                    </td>
                    <td className='px-5 py-4'>
                      <p className='text-white/62'>{key.ownerName}</p>
                      <p className='mt-1 text-xs text-white/28'>{key.ownerEmail}</p>
                    </td>
                    <td className='px-5 py-4 text-xs text-white/42'>
                      {new Date(key.expiresAt).toLocaleDateString('zh-CN')}
                    </td>
                    <td className='px-5 py-4 text-xs text-white/42'>
                      {key.lastUsedAt
                        ? new Date(key.lastUsedAt).toLocaleString('zh-CN')
                        : '从未使用'}
                    </td>
                    <td className='px-5 py-4 text-xs'>
                      {key.status === 'revoked' ? '已撤销' : expired ? '已过期' : '有效'}
                    </td>
                    <td className='px-5 py-4 text-right'>
                      {key.status === 'active' && !expired ? (
                        <button
                          type='button'
                          disabled={workingId === `key:${key.id}`}
                          onClick={() => void revokeKey(key)}
                          className='text-xs text-[#df675c] disabled:opacity-40'
                        >
                          {workingId === `key:${key.id}` ? '正在撤销' : '撤销'}
                        </button>
                      ) : (
                        <span className='text-xs text-white/22'>不可操作</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!data.keys.length ? (
                <tr>
                  <td colSpan={6} className='px-5 py-14 text-center text-sm text-white/32'>
                    还没有创建Key
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className='mt-12'>
        <h3 className='font-serif text-3xl'>最近导入</h3>
        <div className='mt-5 overflow-x-auto border border-white/10'>
          <table className='w-full min-w-[760px] text-left text-sm'>
            <thead className='border-b border-white/10 bg-white/[0.025] text-xs text-white/34'>
              <tr>
                <th className='px-5 py-4 font-normal'>用户</th>
                <th className='px-5 py-4 font-normal'>草稿</th>
                <th className='px-5 py-4 font-normal'>Skill版本</th>
                <th className='px-5 py-4 font-normal'>状态</th>
                <th className='px-5 py-4 font-normal'>时间</th>
              </tr>
            </thead>
            <tbody>
              {data.imports.map((item) => (
                <tr key={item.id} className='border-b border-white/8 last:border-b-0'>
                  <td className='px-5 py-4'>
                    <p>{item.ownerName}</p>
                    <p className='mt-1 text-xs text-white/28'>{item.ownerEmail}</p>
                  </td>
                  <td className='px-5 py-4'>
                    {item.scriptId ? (
                      <a
                        href={`/scripts/${item.scriptId}`}
                        className='text-[#df675c] hover:text-white'
                      >
                        {item.scriptTitle ?? item.scriptId}
                      </a>
                    ) : (
                      <span className='text-white/28'>未生成</span>
                    )}
                  </td>
                  <td className='px-5 py-4 font-mono text-xs text-white/42'>
                    {item.skillVersion ?? '未知'}
                  </td>
                  <td className='px-5 py-4 text-xs'>
                    {item.status === 'committed'
                      ? '待审核'
                      : item.status === 'processing'
                        ? '处理中'
                        : `失败 ${item.errorCode ?? ''}`}
                  </td>
                  <td className='px-5 py-4 text-xs text-white/36'>
                    {new Date(item.createdAt).toLocaleString('zh-CN')}
                  </td>
                </tr>
              ))}
              {!data.imports.length ? (
                <tr>
                  <td colSpan={5} className='px-5 py-14 text-center text-sm text-white/32'>
                    还没有Agent导入记录
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
