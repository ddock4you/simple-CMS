'use client';

/**
 * 시연 모드 자동 부트스트랩 splash UI.
 *
 * 마운트 시 `/_cms/admin/api/demo/bootstrap` POST 호출 → 단계별 메시지 표시 →
 * 응답 따라 분기:
 *   - 200 → success → router.replace(nextPath)
 *   - 503 + SEED_NOT_FOUND → 운영자 안내 + [다시 시도]
 *   - 기타 → 일반 에러 + [다시 시도]
 *
 * Tailwind 기본 utility class만 사용 (admin/web 양쪽 호환).
 */
import { useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { demoAdminApiPath } from '@simple-cms/types';

const STAGE_MESSAGES = [
  '데이터베이스 초기화 중...',
  '예시 콘텐츠 불러오는 중...',
  '거의 다 됐어요...',
] as const;

const STAGE_INTERVAL_MS = 700;
const BOOTSTRAP_ENDPOINT = demoAdminApiPath('/api/demo/bootstrap');

type Status = 'pending' | 'success' | 'seed_not_found' | 'error';

interface DemoBootstrapClientProps {
  nextPath: string;
}

export function DemoBootstrapClient({ nextPath }: DemoBootstrapClientProps) {
  const [status, setStatus] = useState<Status>('pending');
  const [stage, setStage] = useState(0);
  const router = useRouter();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return; // StrictMode 이중 호출 회피
    startedRef.current = true;

    const interval = setInterval(() => {
      setStage((s) => Math.min(s + 1, STAGE_MESSAGES.length - 1));
    }, STAGE_INTERVAL_MS);

    bootstrap();

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function bootstrap() {
    try {
      const response = await fetch(BOOTSTRAP_ENDPOINT, {
        method: 'POST',
        cache: 'no-store',
      });

      if (response.status === 503) {
        const body = (await response.json().catch(() => null)) as
          | { code?: string }
          | null;
        if (body?.code === 'SEED_NOT_FOUND') {
          setStatus('seed_not_found');
          return;
        }
        setStatus('error');
        return;
      }

      if (!response.ok) {
        setStatus('error');
        return;
      }

      setStatus('success');
      // 사용자가 success 단계 인지 후 navigate
      setTimeout(() => {
        router.replace(nextPath);
        router.refresh();
      }, 250);
    } catch {
      setStatus('error');
    }
  }

  function handleRetry() {
    startedRef.current = false;
    setStatus('pending');
    setStage(0);
    // 명시적 재진입
    setTimeout(() => {
      startedRef.current = true;
      bootstrap();
    }, 0);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        {status === 'pending' && (
          <>
            <h1 className="text-2xl font-semibold mb-4">시연 환경 준비 중</h1>
            <p className="text-base text-gray-600" aria-live="polite">
              {STAGE_MESSAGES[stage]}
            </p>
            <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div className="h-full w-1/3 animate-pulse bg-blue-500" />
            </div>
          </>
        )}
        {status === 'success' && (
          <>
            <h1 className="text-2xl font-semibold mb-4">완료</h1>
            <p className="text-base text-gray-600">
              시연 환경으로 이동합니다...
            </p>
          </>
        )}
        {status === 'seed_not_found' && (
          <>
            <h1 className="text-2xl font-semibold mb-4">
              시연 데이터가 준비되지 않았습니다
            </h1>
            <p className="text-base text-gray-600 mb-6">
              운영자가 시연용 초기 데이터를 아직 등록하지 않은 상태입니다.
              잠시 후 다시 시도해 주시거나 운영자에게 문의해 주세요.
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-md bg-gray-900 px-4 py-2 text-white text-sm font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
            >
              다시 시도
            </button>
          </>
        )}
        {status === 'error' && (
          <>
            <h1 className="text-2xl font-semibold mb-4">일시적 오류</h1>
            <p className="text-base text-gray-600 mb-6">
              일시적 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-md bg-gray-900 px-4 py-2 text-white text-sm font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
            >
              다시 시도
            </button>
          </>
        )}
      </div>
    </div>
  );
}
