export type ShowcaseLinkType = 'none' | 'script' | 'external';

export const DEFAULT_SHOWCASE_REEL_SPEED = 30;
export const MIN_SHOWCASE_REEL_SPEED = 15;
export const MAX_SHOWCASE_REEL_SPEED = 60;

export interface ShowcaseSettingsDto {
  reelSpeedPxPerSecond: number;
  updatedAt: string | null;
}

export interface ShowcasePosterDto {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  linkType: ShowcaseLinkType;
  linkHref: string | null;
  linkedScriptId: string | null;
  externalUrl: string | null;
  sortOrder: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShowcasePosterInput {
  title: string;
  subtitle?: string;
  linkType: ShowcaseLinkType;
  linkedScriptId?: string;
  externalUrl?: string;
  published: boolean;
}
