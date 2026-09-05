'use client';

import { initialOrders, initialUsers } from '@/features/script-library/api/demo-admin-data';
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
  orders: DemoOrder[];
  purchasedIds: string[];
  scriptsLoading: boolean;
  logout: () => Promise<void>;
  purchaseScript: (scriptId: string) => PurchaseResult;
  adjustPoints: (userId: string, amount: number) => void;
  setUserDiscount: (userId: string, discount: number) => void;
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
  const [users, setUsers] = useState(initialUsers);
  const [orders] = useState(initialOrders);
  const [purchasedIds, setPurchasedIds] = useState<string[]>([]);

  const role: DemoRole = session?.user.role ?? 'guest';
  const currentUser: DemoUser | null = session
    ? {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        points: session.user.pointsBalance,
        discount: session.user.discountBasisPoints / 100,
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

  const purchaseScript = (scriptId: string): PurchaseResult => {
    if (role !== 'member' || !currentUser) {
      return { ok: false, message: '请先登录白名单账号' };
    }
    const script = scripts.find((item) => item.id === scriptId);
    if (!script || script.status !== 'available') {
      return { ok: false, message: '该剧本已售出或暂不可购买' };
    }
    return { ok: false, message: '购买功能将在交易阶段接入，当前请联系管理员' };
  };

  const adjustPoints = (userId: string, amount: number) => {
    setUsers((items) =>
      items.map((item) =>
        item.id === userId ? { ...item, points: Math.max(0, item.points + amount) } : item
      )
    );
  };

  const setUserDiscount = (userId: string, discount: number) => {
    setUsers((items) => items.map((item) => (item.id === userId ? { ...item, discount } : item)));
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
    orders,
    purchasedIds,
    scriptsLoading,
    logout,
    purchaseScript,
    adjustPoints,
    setUserDiscount,
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
