export interface AgentAccessUserDto {
  id: string;
  name: string;
  email: string;
  role: 'member' | 'admin';
  enabled: boolean;
  grantedAt: string | null;
  activeKeyCount: number;
}

export interface AgentApiKeyDto {
  id: string;
  ownerUserId: string;
  ownerName: string;
  ownerEmail: string;
  name: string;
  keyHint: string;
  status: 'active' | 'revoked';
  expired: boolean;
  expiresAt: string;
  lastUsedAt: string | null;
  lastUsedIp: string | null;
  lastSkillVersion: string | null;
  createdAt: string;
  revokedAt: string | null;
}

export interface AgentImportDto {
  id: string;
  ownerName: string;
  ownerEmail: string;
  status: 'processing' | 'committed' | 'failed';
  scriptId: string | null;
  scriptTitle: string | null;
  errorCode: string | null;
  skillVersion: string | null;
  createdAt: string;
  committedAt: string | null;
}

export interface AgentPrincipal {
  apiKeyId: string;
  userId: string;
  userName: string;
  userEmail: string;
  skillVersion: string;
}
