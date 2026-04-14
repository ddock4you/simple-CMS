'use client';

import { useEffect } from 'react';

import { reportError } from '@/shared/lib/errorReporter';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError({
      level: 'ERROR',
      source: error.digest ? 'SERVER_SSR' : 'CLIENT_REACT',
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      metadata: { scope: 'global-error' },
    });
  }, [error]);

  return (
    <html lang="ko">
      <body>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            padding: '1.5rem',
            fontFamily: 'sans-serif',
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
            치명적인 오류가 발생했습니다
          </h2>
          <p style={{ color: '#666' }}>잠시 후 다시 시도해 주세요.</p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #ccc',
              borderRadius: '4px',
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
