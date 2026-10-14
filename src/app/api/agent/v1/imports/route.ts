import { authenticateAgentRequest, assertAgentRateLimit } from '@/modules/agent-access/service';
import {
  beginAgentImport,
  commitAgentImport,
  failAgentImport
} from '@/modules/agent-import/service';
import { assertAgentFormalImport } from '@/modules/agent-import/validation';
import { prepareNewScriptAssets } from '@/modules/script-catalog/assets';
import { createScript, createScriptId } from '@/modules/script-catalog/service';
import { readCatalogScriptInput } from '@/modules/script-catalog/validation';
import { withApiHandler } from '@/shared/api/handler';
import { AppError } from '@/shared/api/errors';

const IDEMPOTENCY_PATTERN = /^[a-zA-Z0-9._:-]{8,100}$/;
const MAX_IMPORT_BYTES = 100 * 1024 * 1024;

function requireIdempotencyKey(request: Request): string {
  const value = request.headers.get('idempotency-key') ?? '';
  if (!IDEMPOTENCY_PATTERN.test(value)) {
    throw new AppError('BAD_REQUEST', '请提供8-100位有效的 Idempotency-Key', 400);
  }
  return value;
}

function assertBodySize(request: Request): void {
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_IMPORT_BYTES) {
    throw new AppError('VALIDATION_ERROR', '单次导入总文件不能超过100 MB', 422);
  }
}

export function POST(request: Request) {
  return withApiHandler(request, async () => {
    assertBodySize(request);
    const principal = await authenticateAgentRequest(request);
    await assertAgentRateLimit({
      apiKeyId: principal.apiKeyId,
      scope: 'imports:10m',
      max: 3,
      windowMs: 10 * 60_000
    });
    await assertAgentRateLimit({
      apiKeyId: principal.apiKeyId,
      scope: 'imports:day',
      max: 20,
      windowMs: 24 * 60 * 60_000
    });
    const idempotencyKey = requireIdempotencyKey(request);
    const formData = await request.formData();
    const totalFileBytes = [...formData.values()].reduce(
      (total, value) => total + (value instanceof File ? value.size : 0),
      0
    );
    if (totalFileBytes > MAX_IMPORT_BYTES) {
      throw new AppError('VALIDATION_ERROR', '单次导入总文件不能超过100 MB', 422);
    }
    formData.set('status', 'draft');
    formData.set('price', '0');
    const input = readCatalogScriptInput(formData);
    await assertAgentFormalImport(input, formData);
    const operation = await beginAgentImport(principal, idempotencyKey, input.title);
    if (operation.existingScriptId) {
      return {
        data: {
          importId: operation.id,
          scriptId: operation.existingScriptId,
          status: 'committed' as const,
          alreadyProcessed: true
        },
        headers: { 'Cache-Control': 'private, no-store' }
      };
    }

    const scriptId = createScriptId();
    try {
      const assets = await prepareNewScriptAssets(scriptId, formData);
      await createScript(scriptId, input, assets, principal.userId);
      await commitAgentImport(operation.id, scriptId, principal);
      return {
        data: {
          importId: operation.id,
          scriptId,
          status: 'committed' as const,
          alreadyProcessed: false
        },
        status: 201,
        headers: { 'Cache-Control': 'private, no-store' }
      };
    } catch (error) {
      await failAgentImport(operation.id, error).catch(() => undefined);
      throw error;
    }
  });
}
