import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import type { ApiFailure, ApiHandlerResult, ApiMeta, ApiSuccess } from './contracts';
import { AppError } from './errors';

const REQUEST_ID_PATTERN = /^[a-zA-Z0-9._:-]{1,100}$/;

function getRequestId(request: Request): string {
  const suppliedId = request.headers.get('x-request-id');

  return suppliedId && REQUEST_ID_PATTERN.test(suppliedId) ? suppliedId : crypto.randomUUID();
}

function createMeta(requestId: string): ApiMeta {
  return { requestId, timestamp: new Date().toISOString() };
}

export async function withApiHandler<T>(
  request: Request,
  handler: () => Promise<ApiHandlerResult<T>> | ApiHandlerResult<T>
): Promise<NextResponse<ApiSuccess<T> | ApiFailure>> {
  const requestId = getRequestId(request);

  try {
    const result = await handler();
    const body: ApiSuccess<T> = {
      success: true,
      data: result.data,
      meta: createMeta(requestId)
    };

    return NextResponse.json(body, {
      status: result.status ?? 200,
      headers: { ...Object.fromEntries(new Headers(result.headers)), 'x-request-id': requestId }
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            ...(error.details === undefined ? {} : { details: error.details })
          },
          meta: createMeta(requestId)
        },
        { status: error.status, headers: { 'x-request-id': requestId } }
      );
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '提交的数据不符合要求',
            details: error.issues.map((issue) => ({
              path: issue.path.join('.'),
              message: issue.message
            }))
          },
          meta: createMeta(requestId)
        },
        { status: 422, headers: { 'x-request-id': requestId } }
      );
    }

    console.error('Unhandled API error', { requestId, error });
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: '服务器暂时无法处理请求' },
        meta: createMeta(requestId)
      },
      { status: 500, headers: { 'x-request-id': requestId } }
    );
  }
}
