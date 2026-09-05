'use client';

import type {
  DemoOrder,
  DemoRole,
  DemoScript,
  DemoUser,
  ScriptAdminUpdate
} from '@/features/script-library/api/types';
import { authClient } from '@/modules/identity/auth-client';
import { createContext, useContext, useEffect, useState } from 'react';

interface PurchaseResult {
  ok: boolean;
  message: string;
}

interface ScriptLibraryDemoContextValue {
  role: DemoRole;
  authPending: boolean;
  currentUser: DemoUser | null;
  scripts: DemoScript[];
  users: DemoUser[];
  usersLoading: boolean;
  usersError: string;
  orders: DemoOrder[];
  ordersLoading: boolean;
  ordersError: string;
  purchasedIds: string[];
  scriptsLoading: boolean;
  logout: () => Promise<void>;
  purchaseScript: (scriptId: string) => Promise<PurchaseResult>;
  adjustPoints: (userId: string, amount: number, note: string) => Promise<PurchaseResult>;
  createScript: (formData: FormData) => Promise<PurchaseResult>;
  loadScript: (scriptId: string) => Promise<DemoScript | null>;
  updateScript: (input: ScriptAdminUpdate) => Promise<PurchaseResult>;
  deleteScript: (scriptId: string) => Promise<PurchaseResult>;
}

const ScriptLibraryDemoContext = createContext<ScriptLibraryDemoContextValue | null>(null);

async function logout(): Promise<void> {
  await authClient.signOut();
}

export function ScriptLibraryDemoProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending: authPending } = authClient.useSession();
  const [scripts, setScripts] = useState<DemoScript[]>([]);
  const [scriptsLoading, setScriptsLoading] = useState(true);
  const [users, setUsers] = useState<DemoUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [orders, setOrders] = useState<DemoOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState('');
  const [purchasedIds, setPurchasedIds] = useState<string[]>([]);
  const [pointsOverride, setPointsOverride] = useState<number | null>(null);

  const role: DemoRole = session?.user.role ?? 'guest';
  const currentUser: DemoUser | null = session
    ? {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        points: pointsOverride ?? session.user.pointsBalance,
        role: session.user.role
      }
    : null;

  useEffect(() => {
    if (authPending) return;
    let active = true;
    const endpoint = role === 'admin' ? '/api/v1/admin/scripts' : '/api/v1/scripts';
    fetch(endpoint, { cache: role === 'admin' ? 'no-store' : 'default' })
      .then(async (response) => {
        const payload = (await response.json()) as {
          success: boolean;
          data?: { items: DemoScript[] };
        };
        if (active && response.ok && payload.success && payload.data) {
          setScripts(payload.data.items);
        }
      })
      .finally(() => {
        if (active) setScriptsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authPending, role]);

  useEffect(() => {
    if (authPending || role !== 'admin') return;
    let active = true;
    fetch('/api/v1/admin/orders', { cache: 'no-store' })
      .then(async (response) => {
        const payload = (await response.json()) as {
          success: boolean;
          data?: { items: DemoOrder[] };
        };
        if (active && response.ok && payload.success && payload.data) {
          setOrders(payload.data.items);
        } else if (active) {
          setOrdersError('订单读取失败');
        }
      })
      .catch(() => {
        if (active) setOrdersError('当前无法连接订单服务');
      })
      .finally(() => {
        if (active) setOrdersLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authPending, role]);

  useEffect(() => {
    if (authPending || role !== 'member') return;
    let active = true;
    fetch('/api/v1/account', { cache: 'no-store' })
      .then(async (response) => {
        const payload = (await response.json()) as {
          success: boolean;
          data?: { user: DemoUser; purchasedScriptIds: string[] };
        };
        if (active && response.ok && payload.success && payload.data) {
          setPurchasedIds(payload.data.purchasedScriptIds);
          setPointsOverride(payload.data.user.points);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [authPending, role]);

  useEffect(() => {
    if (authPending || role !== 'admin') return;
    let active = true;
    fetch('/api/v1/admin/users', { cache: 'no-store' })
      .then(async (response) => {
        const payload = (await response.json()) as {
          success: boolean;
          data?: { items: DemoUser[] };
        };
        if (active && response.ok && payload.success && payload.data) {
          setUsers(payload.data.items);
        } else if (active) {
          setUsersError('用户账户读取失败');
        }
      })
      .catch(() => {
        if (active) setUsersError('当前无法连接用户账户服务');
      })
      .finally(() => {
        if (active) setUsersLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authPending, role]);

  const purchaseScript = async (scriptId: string): Promise<PurchaseResult> => {
    if (role !== 'member' || !currentUser) {
      return { ok: false, message: '请先登录白名单账号' };
    }
    const script = scripts.find((item) => item.id === scriptId);
    if (!script || script.status !== 'available') {
      return { ok: false, message: '该剧本已售出或暂不可购买' };
    }
    try {
      const response = await fetch(`/api/v1/scripts/${scriptId}/purchase`, { method: 'POST' });
      const payload = (await response.json()) as {
        success: boolean;
        data?: {
          script: DemoScript;
          balanceAfter: number;
          alreadyOwned: boolean;
        };
        error?: { message?: string };
      };
      if (!response.ok || !payload.success || !payload.data) {
        return { ok: false, message: payload.error?.message ?? '购买未完成' };
      }
      setScripts((items) =>
        items.map((item) => (item.id === scriptId ? payload.data!.script : item))
      );
      setPurchasedIds((items) => (items.includes(scriptId) ? items : [...items, scriptId]));
      setPointsOverride(payload.data.balanceAfter);
      return {
        ok: true,
        message: payload.data.alreadyOwned ? '该剧本已经在你的资产中' : '购买成功，交付文件已解锁'
      };
    } catch {
      return { ok: false, message: '当前无法连接交易服务' };
    }
  };

  const adjustPoints = async (
    userId: string,
    amount: number,
    note: string
  ): Promise<PurchaseResult> => {
    try {
      const response = await fetch(`/api/v1/admin/users/${userId}/points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta: amount, note })
      });
      const payload = (await response.json()) as {
        success: boolean;
        data?: { user: DemoUser };
        error?: { message?: string };
      };
      if (!response.ok || !payload.success || !payload.data) {
        return { ok: false, message: payload.error?.message ?? '心源调整失败' };
      }
      setUsers((items) => items.map((item) => (item.id === userId ? payload.data!.user : item)));
      return { ok: true, message: '心源余额已更新，流水已经记录' };
    } catch {
      return { ok: false, message: '当前无法连接心源账户服务' };
    }
  };

  const createScript = async (formData: FormData): Promise<PurchaseResult> => {
    try {
      const response = await fetch('/api/v1/admin/scripts', { method: 'POST', body: formData });
      const payload = (await response.json()) as {
        success: boolean;
        data?: { script: DemoScript };
        error?: { message?: string };
      };
      if (!response.ok || !payload.success || !payload.data) {
        return { ok: false, message: payload.error?.message ?? '剧本保存失败' };
      }
      setScripts((items) => [payload.data!.script, ...items]);
      return { ok: true, message: '剧本和原始文件已安全保存为草稿' };
    } catch {
      return { ok: false, message: '当前无法连接剧本服务' };
    }
  };

  const loadScript = async (scriptId: string): Promise<DemoScript | null> => {
    const existing = scripts.find((script) => script.id === scriptId);
    if (existing?.detailLoaded) return existing;
    try {
      const response = await fetch(`/api/v1/scripts/${scriptId}`, { cache: 'no-store' });
      const payload = (await response.json()) as {
        success: boolean;
        data?: { script: DemoScript };
      };
      if (!response.ok || !payload.success || !payload.data) return null;
      setScripts((items) => {
        const present = items.some((item) => item.id === scriptId);
        return present
          ? items.map((item) => (item.id === scriptId ? payload.data!.script : item))
          : [...items, payload.data!.script];
      });
      return payload.data.script;
    } catch {
      return null;
    }
  };

  const updateScript = async (input: ScriptAdminUpdate): Promise<PurchaseResult> => {
    const current = scripts.find((script) => script.id === input.id);
    if (!current) return { ok: false, message: '没有找到该剧本' };
    if (current.status === 'sold') {
      return { ok: false, message: '已售出剧本已锁定，不能修改或重新上架' };
    }

    const formData = new FormData();
    const fields = {
      title: input.title,
      englishTitle: input.englishTitle,
      genre: input.genre,
      presentationMode: input.presentationMode,
      price: String(input.price),
      episodes: String(input.episodes),
      logline: input.logline,
      synopsis: input.synopsis,
      directorStatement: input.directorStatement,
      previewRationale: input.previewRationale,
      sourceUnitCount: String(input.sourceUnitCount),
      previewUnitLabel: current.previewUnitLabel ?? '段',
      packageMode: current.packageMode ?? 'bilingual-package',
      status: input.status,
      tags: JSON.stringify(input.tags),
      preview: JSON.stringify(input.preview),
      previewVisibleCount: String(input.previewAmount)
    };
    Object.entries(fields).forEach(([key, value]) => formData.set(key, value));
    if (input.cover) formData.set('cover', input.cover);
    try {
      const response = await fetch(`/api/v1/admin/scripts/${input.id}`, {
        method: 'PATCH',
        body: formData
      });
      const payload = (await response.json()) as {
        success: boolean;
        data?: { script: DemoScript };
        error?: { message?: string };
      };
      if (!response.ok || !payload.success || !payload.data) {
        return { ok: false, message: payload.error?.message ?? '剧本更新失败' };
      }
      setScripts((items) =>
        items.map((script) => (script.id === input.id ? payload.data!.script : script))
      );
      return {
        ok: true,
        message:
          input.status === 'available'
            ? '剧本信息已保存并同步到前台'
            : '剧本已保存为草稿，前台已停止展示'
      };
    } catch {
      return { ok: false, message: '当前无法连接剧本服务' };
    }
  };

  const deleteScript = async (scriptId: string): Promise<PurchaseResult> => {
    const target = scripts.find((script) => script.id === scriptId);
    if (!target) return { ok: false, message: '没有找到该剧本' };
    if (target.status === 'sold') {
      return { ok: false, message: '已售出剧本关联交易记录，只能保留归档' };
    }
    try {
      const response = await fetch(`/api/v1/admin/scripts/${scriptId}`, { method: 'DELETE' });
      const payload = (await response.json()) as {
        success: boolean;
        error?: { message?: string };
      };
      if (!response.ok || !payload.success) {
        return { ok: false, message: payload.error?.message ?? '剧本删除失败' };
      }
      setScripts((items) => items.filter((script) => script.id !== scriptId));
      setPurchasedIds((items) => items.filter((id) => id !== scriptId));
      return { ok: true, message: `《${target.title}》已删除` };
    } catch {
      return { ok: false, message: '当前无法连接剧本服务' };
    }
  };

  const value: ScriptLibraryDemoContextValue = {
    role,
    authPending,
    currentUser,
    scripts,
    users,
    usersLoading,
    usersError,
    orders,
    ordersLoading,
    ordersError,
    purchasedIds,
    scriptsLoading,
    logout,
    purchaseScript,
    adjustPoints,
    createScript,
    loadScript,
    updateScript,
    deleteScript
  };

  return (
    <ScriptLibraryDemoContext.Provider value={value}>{children}</ScriptLibraryDemoContext.Provider>
  );
}

export function useScriptLibraryDemo(): ScriptLibraryDemoContextValue {
  const context = useContext(ScriptLibraryDemoContext);
  if (!context) {
    throw new Error('useScriptLibraryDemo must be used within ScriptLibraryDemoProvider');
  }
  return context;
}
