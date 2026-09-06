// Avoid logging ORM query parameters, credentials, request bodies or script content.
export function logServerError(label: string, error: unknown, requestId?: string): void {
  const cause = error instanceof Error ? error.cause : undefined;
  const candidate = cause instanceof Error ? cause : error;
  const code =
    candidate instanceof Error ? (candidate as Error & { code?: unknown }).code : undefined;
  console.error(label, {
    requestId,
    errorType: error instanceof Error ? error.name : 'UnknownError',
    code: typeof code === 'string' && /^[A-Z0-9_]{1,40}$/.test(code) ? code : undefined,
    frames:
      error instanceof Error
        ? error.stack
            ?.split('\n')
            .filter((line) => /^\s+at /.test(line))
            .slice(0, 12)
        : undefined
  });
}
