export type DemoRole = 'guest' | 'member' | 'admin';

export type ScriptStatus = 'draft' | 'available' | 'sold';

export type ScriptPackageMode = 'bilingual-package' | 'parallel-production';

export type ScriptPresentationMode = '解说' | '演绎';

export interface ScriptPreviewLine {
  zh: string;
  en: string;
}

export interface DirectorSection {
  id: string;
  title: string;
  summary: string;
}

export interface DemoScript {
  id: string;
  title: string;
  englishTitle: string;
  genre: string;
  image: string;
  logline: string;
  synopsis: string;
  directorStatement: string;
  directorSections?: DirectorSection[];
  preview: ScriptPreviewLine[];
  sourcePairCount?: number;
  sourceUnitCount?: number;
  previewUnitCount?: number;
  previewUnitLabel?: '段' | '场';
  previewVisibleCount?: number;
  previewSceneBreaks?: number[];
  previewRationale?: string;
  packageMode?: ScriptPackageMode;
  presentationMode: ScriptPresentationMode;
  price: number;
  status: ScriptStatus;
  episodes: number;
  format: string;
  tags: string[];
  deliverables: {
    script: string;
    bilingual?: string;
    chinese?: string;
    directorStatement: string;
  };
  detailLoaded?: boolean;
}

export interface ScriptAdminUpdate {
  id: string;
  title: string;
  englishTitle: string;
  genre: string;
  presentationMode: ScriptPresentationMode;
  price: number;
  episodes: number;
  logline: string;
  synopsis: string;
  directorStatement: string;
  tags: string[];
  sourceUnitCount: number;
  previewRationale: string;
  preview: ScriptPreviewLine[];
  previewStructureChanged: boolean;
  previewAmount: number;
  status: Exclude<ScriptStatus, 'sold'>;
  cover?: File;
}

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  points: number;
  role: 'member' | 'admin';
  createdAt?: string;
}

export interface PointLedgerEntry {
  id: string;
  direction: 'credit' | 'debit';
  amount: number;
  balanceAfter: number;
  source: 'admin-adjustment' | 'recharge' | 'purchase' | 'refund';
  note: string;
  createdAt: string;
}

export interface RechargePlan {
  id: string;
  name: string;
  amountCents: number;
  amountYuan: number;
  basePoints: number;
  bonusPoints: number;
  totalPoints: number;
  effectiveDiscount: number;
  isActive: boolean;
}

export interface DemoOrder {
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
