'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface PreviewBannerProps {
  /**
   * 표시 힌트 (예: '서브 페이지 미리보기', '게시글 미리보기').
   */
  label?: string;
}

export function PreviewBanner({ label = '미리보기 모드' }: PreviewBannerProps) {
  const router = useRouter();
  const [isExiting, setIsExiting] = useState(false);

  const handleExit = async () => {
    if (isExiting) return;
    setIsExiting(true);
    try {
      await fetch('/api/preview/exit', { method: 'POST' });
    } catch {
      // 네트워크 실패해도 클라이언트는 새로고침 시도
    }
    router.refresh();
  };

  return (
    <div className="preview-banner" role="status" aria-live="polite">
      <div className="preview-banner-inner">
        <span className="preview-banner-label">{label} — DRAFT 포함</span>
        <button
          type="button"
          className="preview-banner-exit"
          onClick={handleExit}
          disabled={isExiting}
        >
          {isExiting ? '종료 중...' : '미리보기 종료'}
        </button>
      </div>
    </div>
  );
}
