import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, open, rename, stat, unlink } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';

import type {
  StorageHealth,
  StorageProvider,
  StorageWriteInput,
  StoredObject,
  StoredObjectStat
} from './storage-provider';

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT';
}

export class LocalStorageProvider implements StorageProvider {
  readonly driver = 'local' as const;
  private readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  private resolveKey(key: string): string {
    if (!key || isAbsolute(key) || key.includes('\\')) {
      throw new Error('Invalid storage key');
    }

    const target = resolve(this.root, key);
    const relativePath = relative(this.root, target);
    if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
      throw new Error('Storage key escapes the configured root');
    }

    return target;
  }

  async write(input: StorageWriteInput): Promise<StoredObject> {
    const target = this.resolveKey(input.key);
    const temporaryTarget = `${target}.${randomUUID()}.uploading`;
    await mkdir(dirname(target), { recursive: true, mode: 0o750 });

    try {
      const handle = await open(temporaryTarget, 'wx', 0o600);
      try {
        await handle.writeFile(input.data);
        await handle.sync();
      } finally {
        await handle.close();
      }
      await rename(temporaryTarget, target);
    } catch (error) {
      await unlink(temporaryTarget).catch(() => undefined);
      throw error;
    }

    return {
      provider: this.driver,
      key: input.key,
      byteSize: input.data.byteLength,
      checksumSha256: createHash('sha256').update(input.data).digest('hex'),
      contentType: input.contentType,
      originalName: input.originalName,
      visibility: input.visibility
    };
  }

  async open(key: string) {
    const target = this.resolveKey(key);
    await stat(target);
    return createReadStream(target);
  }

  async stat(key: string): Promise<StoredObjectStat | null> {
    try {
      const objectStat = await stat(this.resolveKey(key));
      return {
        key,
        byteSize: objectStat.size,
        updatedAt: objectStat.mtime
      };
    } catch (error) {
      if (isMissingFileError(error)) return null;
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    return (await this.stat(key)) !== null;
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.resolveKey(key));
    } catch (error) {
      if (!isMissingFileError(error)) throw error;
    }
  }

  async healthCheck(): Promise<StorageHealth> {
    await mkdir(this.root, { recursive: true, mode: 0o750 });
    const probeKey = `.health/${randomUUID()}`;
    const probe = this.resolveKey(probeKey);
    await mkdir(dirname(probe), { recursive: true, mode: 0o750 });
    const handle = await open(probe, 'wx', 0o600);
    await handle.close();
    await unlink(probe);
    return { healthy: true, provider: this.driver };
  }
}
