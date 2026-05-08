'use client';

/**
 * 시연 모드 안내 배너 (web).
 *
 * - 좌측: warning Badge 스타일 + "시연 모드 — 1시간 후 자동 초기화" 안내
 * - 가운데: 남은 시간 카운트다운 (setInterval 1s update)
 * - 우측: [새 세션 시작] 버튼 → window.confirm → POST /_cms/admin/api/demo/reset → router.replace
 *
 * web은 shadcn/AlertDialog 없이 native `confirm()` 사용 — KRDS 정부 사이트 톤과 일관.
 *
 * 만료 도달 시: countdown 표시는 "0초"로 멈추되 redirect는 하지 않음 — 다음 navigation에서
 * layout gate(ensureDemoSession)가 splash로 보낸다.
 *
 * sticky: top-0 z-50 h-9 — KRDS Header 위에 별도 strip. Header는 비sticky라 chain 충돌 없음.
 */
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface DemoBannerProps {
  /** Session.expires ISO string. ensureDemoSession이 layout에서 prop으로 전달 */
  expiresAt: string;
  /** [새 세션 시작] reset API 경로. admin/web 모두 단일 도메인 + admin basePath이라 명시 prefix */
  resetEndpoint?: string;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return '0초';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}시간 ${minutes}분 ${seconds}초`;
  }
  return `${minutes}분 ${seconds}초`;
}

export function DemoBanner({
  expiresAt,
  resetEndpoint = '/_cms/admin/api/demo/reset',
}: DemoBannerProps) {
  const router = useRouter();
  const expiresMs = useRef(new Date(expiresAt).getTime());
  const [remaining, setRemaining] = useState<number>(() =>
    Math.max(0, expiresMs.current - Date.now()),
  );
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    expiresMs.current = new Date(expiresAt).getTime();
    setRemaining(Math.max(0, expiresMs.current - Date.now()));
  }, [expiresAt]);

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(Math.max(0, expiresMs.current - Date.now()));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const handleReset = async () => {
    if (isResetting) return;
    const ok = window.confirm(
      '현재 세션의 모든 콘텐츠와 업로드 파일이 삭제되고, 시드 데이터로 초기화된 새 세션으로 이동합니다. 계속할까요?',
    );
    if (!ok) return;

    setIsResetting(true);
    try {
      const res = await fetch(resetEndpoint, {
        method: 'POST',
        credentials: 'same-origin',
      });
      const json = (await res.json().catch(() => null)) as
        | { success: boolean; data?: { redirectTo: string }; error?: string }
        | null;
      if (!res.ok || !json?.success) {
        window.alert(json?.error ?? '세션 초기화 중 오류가 발생했습니다.');
        return;
      }
      const redirectTo = json.data?.redirectTo ?? '/demo-bootstrap';
      router.replace(redirectTo);
    } catch (err) {
      console.error('[DemoBanner] reset error', err);
      window.alert('세션 초기화 중 네트워크 오류가 발생했습니다.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div
      data-testid="demo-banner"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        height: '36px',
        padding: '0 16px',
        background: '#fff8e1',
        borderBottom: '1px solid #ffd54f',
        fontSize: '12px',
        color: '#1f2937',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          minWidth: 0,
        }}
      >
        <span
          style={{
            background: '#f59e0b',
            color: '#fff',
            padding: '2px 8px',
            borderRadius: '4px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          시연 모드
        </span>
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          모든 데이터는 1시간 후 자동 초기화됩니다.
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          남은 시간 {formatRemaining(remaining)}
        </span>
        <button
          type="button"
          onClick={handleReset}
          disabled={isResetting}
          style={{
            height: '28px',
            padding: '0 12px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            background: '#fff',
            color: '#1f2937',
            fontSize: '12px',
            fontWeight: 500,
            cursor: isResetting ? 'not-allowed' : 'pointer',
            opacity: isResetting ? 0.6 : 1,
          }}
        >
          {isResetting ? '초기화 중…' : '새 세션 시작'}
        </button>
      </div>
    </div>
  );
}
