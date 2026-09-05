'use client';

import { initialOrders, initialScripts, initialUsers } from '@/features/script-library/api/service';
import type {
  DemoOrder,
  DemoRole,
  DemoScript,
  DemoUser,
  ScriptAdminUpdate,
  ScriptPackageMode,
  ScriptPreviewLine,
  ScriptPresentationMode
} from '@/features/script-library/api/types';
import { authClient } from '@/modules/identity/auth-client';
import { createContext, useContext, useState } from 'react';

interface PurchaseResult {
  ok: boolean;
  message: string;
}

interface UploadScriptInput {
  title: string;
  englishTitle: string;
  genre: string;
  price: number;
  episodes: number;
  logline: string;
  synopsis: string;
  directorStatement: string;
  previewRationale: string;
  sourceUnitCount: number;
  previewUnitLabel: '段' | '场';
  tags: string[];
  preview: ScriptPreviewLine[];
  image: string;
  deliverables: DemoScript['deliverables'];
  packageMode: ScriptPackageMode;
  presentationMode: ScriptPresentationMode;
}

interface ScriptLibraryDemoContextValue {
  role: DemoRole;
  authPending: boolean;
  currentUser: DemoUser | null;
  scripts: DemoScript[];
  users: DemoUser[];
  orders: DemoOrder[];
  purchasedIds: string[];
  logout: () => Promise<void>;
  purchaseScript: (scriptId: string) => PurchaseResult;
  adjustPoints: (userId: string, amount: number) => void;
  setUserDiscount: (userId: string, discount: number) => void;
  uploadScript: (input: UploadScriptInput) => void;
  updateScript: (input: ScriptAdminUpdate) => PurchaseResult;
  deleteScript: (scriptId: string) => PurchaseResult;
}

const ScriptLibraryDemoContext = createContext<ScriptLibraryDemoContextValue | null>(null);

async function logout(): Promise<void> {
  await authClient.signOut();
}

export function ScriptLibraryDemoProvider({ children }: { children: React.ReactNode }) {
  const { data: session, isPending: authPending } = authClient.useSession();
  const [scripts, setScripts] = useState(initialScripts);
  const [users, setUsers] = useState(initialUsers);
  const [orders, setOrders] = useState(initialOrders);
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

  const purchaseScript = (scriptId: string): PurchaseResult => {
    if (role !== 'member' || !currentUser) {
      return { ok: false, message: '请先登录白名单账号' };
    }
    const script = scripts.find((item) => item.id === scriptId);
    if (!script || script.status !== 'available') {
      return { ok: false, message: '该剧本已售出或暂不可购买' };
    }
    const finalPrice = Math.round((script.price * currentUser.discount) / 100);
    if (currentUser.points < finalPrice) {
      return { ok: false, message: '积分不足，请联系管理员补充积分' };
    }

    setUsers((items) =>
      items.map((item) =>
        item.id === currentUser.id ? { ...item, points: item.points - finalPrice } : item
      )
    );
    setScripts((items) =>
      items.map((item) => (item.id === scriptId ? { ...item, status: 'sold' } : item))
    );
    setPurchasedIds((items) => [...items, scriptId]);
    setOrders((items) => [
      {
        id: `ORD-DEMO-${String(items.length + 1).padStart(3, '0')}`,
        scriptTitle: script.title,
        buyer: currentUser.name,
        amount: finalPrice,
        status: 'completed',
        createdAt: '刚刚'
      },
      ...items
    ]);
    return { ok: true, message: '购买完成，剧本已加入我的剧本' };
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

  const uploadScript = (input: UploadScriptInput) => {
    setScripts((items) => [
      {
        id: `script-demo-${items.length + 1}`,
        title: input.title,
        englishTitle: input.englishTitle,
        genre: input.genre,
        image: input.image,
        logline: input.logline,
        synopsis: input.synopsis,
        directorStatement: input.directorStatement,
        preview: input.preview,
        sourceUnitCount: input.sourceUnitCount,
        previewUnitCount: input.preview.length,
        previewUnitLabel: input.previewUnitLabel,
        previewVisibleCount: input.preview.length,
        previewRationale: input.previewRationale,
        price: input.price,
        status: 'draft',
        episodes: input.episodes,
        presentationMode: input.presentationMode,
        format:
          input.packageMode === 'parallel-production'
            ? 'MD / 中文制作版 + English Production'
            : 'MD / 英文 + 中英对照',
        tags: input.tags,
        packageMode: input.packageMode,
        deliverables: input.deliverables
      },
      ...items
    ]);
  };

  const updateScript = (input: ScriptAdminUpdate): PurchaseResult => {
    const current = scripts.find((script) => script.id === input.id);
    if (!current) return { ok: false, message: '没有找到该剧本' };
    if (current.status === 'sold') {
      return { ok: false, message: '已售出剧本已锁定，不能修改或重新上架' };
    }

    setScripts((items) =>
      items.map((script) => {
        if (script.id !== input.id) return script;
        const sceneBased = script.previewUnitLabel === '场';
        return {
          ...script,
          title: input.title,
          englishTitle: input.englishTitle,
          genre: input.genre,
          presentationMode: input.presentationMode,
          price: input.price,
          episodes: input.episodes,
          logline: input.logline,
          synopsis: input.synopsis,
          preview: input.preview,
          previewRationale: input.previewRationale,
          previewSceneBreaks: input.previewStructureChanged ? undefined : script.previewSceneBreaks,
          previewUnitCount: sceneBased ? input.previewAmount : script.previewUnitCount,
          previewVisibleCount:
            sceneBased && !input.previewStructureChanged
              ? script.previewVisibleCount
              : Math.min(input.previewAmount, input.preview.length),
          status: input.status
        };
      })
    );
    return {
      ok: true,
      message:
        input.status === 'available'
          ? '剧本信息已保存并同步到前台'
          : '剧本已保存为草稿，前台已停止展示'
    };
  };

  const deleteScript = (scriptId: string): PurchaseResult => {
    const target = scripts.find((script) => script.id === scriptId);
    if (!target) return { ok: false, message: '没有找到该剧本' };
    if (target.status === 'sold') {
      return { ok: false, message: '已售出剧本关联交易记录，只能保留归档' };
    }
    setScripts((items) => items.filter((script) => script.id !== scriptId));
    setPurchasedIds((items) => items.filter((id) => id !== scriptId));
    return { ok: true, message: `《${target.title}》已删除` };
  };

  const value: ScriptLibraryDemoContextValue = {
    role,
    authPending,
    currentUser,
    scripts,
    users,
    orders,
    purchasedIds,
    logout,
    purchaseScript,
    adjustPoints,
    setUserDiscount,
    uploadScript,
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
