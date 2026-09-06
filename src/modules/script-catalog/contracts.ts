export type CatalogScriptStatus = 'draft' | 'available' | 'sold';
export type CatalogPackageMode = 'bilingual-package' | 'parallel-production';
export type CatalogPresentationMode = '解说' | '演绎';

export interface CatalogPreviewLine {
  zh: string;
  en: string;
}

export interface CatalogScriptDto {
  id: string;
  version: number;
  title: string;
  englishTitle: string;
  genre: string;
  image: string;
  logline: string;
  synopsis: string;
  directorStatement: string;
  directorSections: { id: string; title: string; summary: string }[];
  preview: CatalogPreviewLine[];
  sourceUnitCount: number | undefined;
  previewUnitCount: number;
  previewUnitLabel: '段' | '场';
  previewVisibleCount: number;
  previewRationale: string;
  packageMode: CatalogPackageMode;
  presentationMode: CatalogPresentationMode;
  price: number;
  status: CatalogScriptStatus;
  episodes: number;
  format: string;
  tags: string[];
  deliverables: {
    script: string;
    bilingual?: string;
    chinese?: string;
    directorStatement: string;
  };
  detailLoaded: boolean;
}

export interface CatalogScriptInput {
  title: string;
  englishTitle: string;
  genre: string;
  logline: string;
  synopsis: string;
  directorStatement: string;
  previewRationale: string;
  sourceUnitCount: number;
  previewUnitLabel: '段' | '场';
  presentationMode: CatalogPresentationMode;
  packageMode: CatalogPackageMode;
  price: number;
  episodes: number;
  status: 'draft' | 'available';
  tags: string[];
  preview: CatalogPreviewLine[];
  previewVisibleCount: number;
}
