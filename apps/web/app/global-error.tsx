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
        <div className="flex min-h-screen flex-col items-center justify-center gap-[16px] p-[24px] text-center font-sans">
          <h2 className="text-[20px] leading-[1.4] font-semibold text-[#1e2124]">
            치명적인 오류가 발생했습니다
          </h2>
          <p className="text-[#555555]">잠시 후 다시 시도해 주세요.</p>
          <button
            type="button"
            onClick={reset}
            className="cursor-pointer rounded-[4px] border border-[#cdd1d5] bg-white px-[16px] py-[8px]"
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
