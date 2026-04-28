'use client';

import { useEffect } from 'react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Admin] Unhandled error', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-6 text-center">
      <h2 className="text-xl font-semibold text-foreground">
        문제가 발생했습니다
      </h2>
      <p className="text-sm text-muted-foreground">
        잠시 후 다시 시도해 주세요.
        {error.digest && (
          <span className="block mt-1 font-mono text-xs text-muted-foreground/60">
            {error.digest}
          </span>
        )}
      </p>
      <button
        type="button"
        onClick={reset}
        className="px-4 py-2 text-sm border rounded-md hover:bg-accent transition-colors cursor-pointer"
      >
        다시 시도
      </button>
    </div>
  );
}
