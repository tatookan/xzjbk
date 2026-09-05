import type { CatalogScriptDto } from '@/modules/script-catalog/contracts';

export type PurchasedFileKind = 'script' | 'bilingual' | 'chinese' | 'director-statement';

export interface ScriptOrderDto {
  id: string;
  orderNo: string;
  scriptId: string;
  scriptTitle: string;
  buyerUserId: string;
  buyer: string;
  buyerEmail: string;
  amount: number;
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  createdAt: string;
  completedAt: string | null;
}

export interface ScriptPurchaseDto {
  order: ScriptOrderDto;
  script: CatalogScriptDto;
  balanceAfter: number;
  alreadyOwned: boolean;
}
