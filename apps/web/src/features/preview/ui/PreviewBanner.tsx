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
    <div className="sticky top-0 z-[1000] border-b border-[#98690a] bg-[#ffb724] text-[#1e2124] shadow-[0_1px_3px_rgba(0,0,0,0.08)]" role="status" aria-live="polite">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-[12px] px-[16px] py-[6px] text-[13px] leading-[1.5] font-semibold medium:px-[24px] medium:py-[8px] medium:text-[14px]">
        <span>{label} — DRAFT 포함</span>
        <button
          type="button"
          className="rounded-[4px] border-0 bg-[#1e2124] px-[12px] py-[4px] text-[13px] leading-[1.5] font-medium text-white hover:bg-[#131416] disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handleExit}
          disabled={isExiting}
        >
          {isExiting ? '종료 중...' : '미리보기 종료'}
        </button>
      </div>
    </div>
  );
}
