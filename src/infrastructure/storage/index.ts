import { ConfigurationError } from '@/shared/api/errors';
import { getServerEnv } from '@/shared/config/server-env';

import { LocalStorageProvider } from './local-storage-provider';
import type { StorageProvider } from './storage-provider';

let storageProvider: StorageProvider | undefined;

export function getStorageProvider(): StorageProvider {
  if (storageProvider) return storageProvider;

  const env = getServerEnv();
  if (env.STORAGE_DRIVER === 'local') {
    storageProvider = new LocalStorageProvider(env.STORAGE_LOCAL_ROOT);
    return storageProvider;
  }

  throw new ConfigurationError('OSS storage adapter is not configured');
}

export { createStorageKey } from './storage-key';
export type {
  AssetVisibility,
  StorageDriver,
  StorageHealth,
  StorageProvider,
  StorageWriteInput,
  StoredObject,
  StoredObjectStat
} from './storage-provider';
