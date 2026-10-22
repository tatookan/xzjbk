'use client';

export default function GlobalError({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang='zh-CN'>
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0b0c0e',
          color: '#f4f0e8',
          fontFamily: 'system-ui, sans-serif'
        }}
      >
        <main style={{ width: 'min(560px, calc(100% - 48px))', borderTop: '1px solid #34363b' }}>
          <p style={{ marginTop: 24, color: '#8f9094', fontSize: 12, letterSpacing: '0.2em' }}>
            XINMENG · SYSTEM NOTICE
          </p>
          <h1 style={{ margin: '24px 0 0', fontSize: 40, lineHeight: 1.05 }}>页面暂时无法呈现</h1>
          <p style={{ margin: '20px 0 0', color: '#a7a8ac', lineHeight: 1.8 }}>
            系统遇到了一点问题，请稍后重试。如果问题持续出现，请联系管理员。
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 32,
              minHeight: 44,
              padding: '0 20px',
              border: 0,
              borderRadius: 999,
              background: '#f3efe6',
              color: '#141518',
              font: 'inherit',
              cursor: 'pointer'
            }}
          >
            重新加载
          </button>
        </main>
      </body>
    </html>
  );
}
