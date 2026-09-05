'use client';

import {
  initialInvites,
  initialOrders,
  initialRecharges,
  initialScripts,
  initialUsers
} from '@/features/script-library/api/service';
import type {
  DemoInvite,
  DemoOrder,
  DemoRecharge,
  DemoRole,
  DemoScript,
  DemoUser,
  ScriptAdminUpdate,
  ScriptPackageMode,
  ScriptPreviewLine,
  ScriptPresentationMode
} from '@/features/script-library/api/types';
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
  currentUser: DemoUser | null;
  scripts: DemoScript[];
  users: DemoUser[];
  invites: DemoInvite[];
  orders: DemoOrder[];
  recharges: DemoRecharge[];
  purchasedIds: string[];
  loginAs: (role: Exclude<DemoRole, 'guest'>) => void;
  logout: () => void;
  register: (code: string) => PurchaseResult;
  purchaseScript: (scriptId: string) => PurchaseResult;
  recharge: (amount: number) => void;
  syncRecharge: (rechargeId: string) => PurchaseResult;
  adjustPoints: (userId: string, amount: number) => void;
  setUserDiscount: (userId: string, discount: number) => void;
  generateInvite: () => string;
  uploadScript: (input: UploadScriptInput) => void;
  updateScript: (input: ScriptAdminUpdate) => PurchaseResult;
  deleteScript: (scriptId: string) => PurchaseResult;
}

const ScriptLibraryDemoContext = createContext<ScriptLibraryDemoContextValue | null>(null);

function makeCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const values = new Uint8Array(6);
  crypto.getRandomValues(values);
  return `XZ-${Array.from(values, (value) => alphabet[value % alphabet.length]).join('')}`;
}

export function ScriptLibraryDemoProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<DemoRole>('guest');
  const [scripts, setScripts] = useState(initialScripts);
  const [users, setUsers] = useState(initialUsers);
  const [invites, setInvites] = useState(initialInvites);
  const [orders, setOrders] = useState(initialOrders);
  const [recharges, setRecharges] = useState(initialRecharges);
  const [purchasedIds, setPurchasedIds] = useState<string[]>([]);

  const currentUser =
    role === 'admin'
      ? (users.find((user) => user.role === 'admin') ?? null)
      : role === 'member'
        ? (users.find((user) => user.id === 'user-shen') ?? null)
        : null;

  const loginAs = (nextRole: Exclude<DemoRole, 'guest'>) => setRole(nextRole);
  const logout = () => setRole('guest');

  const register = (code: string): PurchaseResult => {
    const normalizedCode = code.trim().toUpperCase();
    const invite = invites.find(
      (item) => item.status === 'unused' && item.code.toUpperCase() === normalizedCode
    );
    if (!invite && normalizedCode !== 'XINZHI-2026') {
      return { ok: false, message: '注册码无效或已经使用' };
    }
    if (invite) {
      setInvites((items) =>
        items.map((item) =>
          item.id === invite.id ? { ...item, status: 'used', usedBy: '沈予安' } : item
        )
      );
    }
    setRole('member');
    return { ok: true, message: '注册成功' };
  };

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
      return { ok: false, message: '积分不足，请先充值' };
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

  const recharge = (amount: number) => {
    const points = amount * 10;
    setUsers((items) =>
      items.map((item) =>
        item.id === 'user-shen' ? { ...item, points: item.points + points } : item
      )
    );
    setRecharges((items) => [
      {
        id: `PAY-DEMO-${String(items.length + 1).padStart(3, '0')}`,
        user: '沈予安',
        amount,
        points,
        status: 'paid',
        createdAt: '刚刚'
      },
      ...items
    ]);
  };

  const syncRecharge = (rechargeId: string): PurchaseResult => {
    const target = recharges.find((item) => item.id === rechargeId);
    if (!target || target.status !== 'pending') {
      return { ok: false, message: '该支付单已经处理或不存在' };
    }
    setRecharges((items) =>
      items.map((item) => (item.id === rechargeId ? { ...item, status: 'paid' } : item))
    );
    setUsers((items) =>
      items.map((user) =>
        user.name === target.user ? { ...user, points: user.points + target.points } : user
      )
    );
    return { ok: true, message: `支付状态已同步，${target.points.toLocaleString()} 积分已到账` };
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

  const generateInvite = (): string => {
    const code = makeCode();
    setInvites((items) => [
      { id: `invite-${items.length + 1}`, code, status: 'unused', createdAt: '今天' },
      ...items
    ]);
    return code;
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
    currentUser,
    scripts,
    users,
    invites,
    orders,
    recharges,
    purchasedIds,
    loginAs,
    logout,
    register,
    purchaseScript,
    recharge,
    syncRecharge,
    adjustPoints,
    setUserDiscount,
    generateInvite,
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
