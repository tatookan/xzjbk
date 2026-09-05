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
  previewRationale: string;
  preview: ScriptPreviewLine[];
  previewStructureChanged: boolean;
  previewAmount: number;
  status: Exclude<ScriptStatus, 'sold'>;
}

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  points: number;
  discount: number;
  role: 'member' | 'admin';
}

export interface DemoOrder {
  id: string;
  scriptTitle: string;
  buyer: string;
  amount: number;
  status: 'completed';
  createdAt: string;
}
