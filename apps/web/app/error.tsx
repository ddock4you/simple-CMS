'use client';

import { useEffect } from 'react';

import { reportError } from '@/shared/lib/errorReporter';

export default function ErrorPage({
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
    });
  }, [error]);

  return (
    <div className="error-page">
      <h2 className="error-page-title">문제가 발생했습니다</h2>
      <p className="error-page-description">잠시 후 다시 시도해 주세요.</p>
      <button type="button" onClick={reset} className="error-page-retry">
        다시 시도
      </button>
    </div>
  );
}
