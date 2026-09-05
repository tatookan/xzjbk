import type { Readable } from 'node:stream';

export type StorageDriver = 'local' | 'oss';
export type AssetVisibility = 'public' | 'private';

export interface StorageWriteInput {
  key: string;
  data: Uint8Array;
  contentType: string;
  originalName: string;
  visibility: AssetVisibility;
}

export interface StoredObject {
  provider: StorageDriver;
  key: string;
  byteSize: number;
  checksumSha256: string;
  contentType: string;
  originalName: string;
  visibility: AssetVisibility;
}

export interface StoredObjectStat {
  key: string;
  byteSize: number;
  updatedAt: Date;
}

export interface StorageHealth {
  healthy: boolean;
  provider: StorageDriver;
}

export interface StorageProvider {
  readonly driver: StorageDriver;
  write(input: StorageWriteInput): Promise<StoredObject>;
  open(key: string): Promise<Readable>;
  stat(key: string): Promise<StoredObjectStat | null>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
  healthCheck(): Promise<StorageHealth>;
}
