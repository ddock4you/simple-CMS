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
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-[16px] px-[24px] py-[64px] text-center">
      <h2 className="text-[24px] leading-[1.3] font-bold text-[#1e2124]">문제가 발생했습니다</h2>
      <p className="text-[#555555]">잠시 후 다시 시도해 주세요.</p>
      <button type="button" onClick={reset} className="rounded-[4px] border-0 bg-[#256ef4] px-[24px] py-[12px] text-[16px] leading-[1.5] font-medium text-white hover:opacity-90">
        다시 시도
      </button>
    </div>
  );
}
