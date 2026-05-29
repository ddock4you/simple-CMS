'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

import { Carousel } from '@/shared/ui/Carousel';
import { TiptapContent } from '@/shared/ui/TiptapContent';
import { isPopupHidden, setPopupHidden } from '@/shared/lib/popupCookies';
import type { ActiveHomePopup } from '@/entities/home-popup/api/getActiveHomePopups';

const DEFAULT_SLIDE_OPTIONS = {
  showPrevNext: true,
  showPlayPause: false,
  showDots: true,
  autoPlay: false,
  autoPlayInterval: 5000,
};

interface HomePopupModalProps {
  popups: ActiveHomePopup[];
}

export function HomePopupModal({ popups }: HomePopupModalProps) {
  const [hydrated, setHydrated] = useState(false);
  const [visiblePopups, setVisiblePopups] = useState<ActiveHomePopup[]>([]);
  const [hideToday, setHideToday] = useState(false);
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  // 하이드레이션 직후 쿠키 기반 필터링 — 서버에서는 쿠키를 읽을 수 없어 마운트 후 1회 수행
  useEffect(() => {
    const filtered = popups.filter((p) => !isPopupHidden(p.id));
    /* eslint-disable react-hooks/set-state-in-effect */
    setHydrated(true);
    setVisiblePopups(filtered);
    setOpen(filtered.length > 0);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [popups]);

  // 열릴 때: body 스크롤 잠금 + 포커스 저장/이동 + 정리
  useEffect(() => {
    if (!open) return;
    prevFocusRef.current =
      (document.activeElement as HTMLElement | null) ?? null;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = window.setTimeout(() => dialogRef.current?.focus(), 0);
    return () => {
      document.body.style.overflow = original;
      window.clearTimeout(t);
      prevFocusRef.current?.focus();
    };
  }, [open]);

  const close = useCallback(() => {
    if (hideToday) {
      visiblePopups.forEach((p) => setPopupHidden(p.id));
    }
    setOpen(false);
  }, [hideToday, visiblePopups]);

  // ESC로 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, close]);

  if (!hydrated || !open || visiblePopups.length === 0) return null;

  const isSingle = visiblePopups.length === 1;

  const renderPopupBody = (popup: ActiveHomePopup) => {
    if (popup.popupType === 'IMAGE' && popup.imageUrl) {
      const img = (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={popup.imageUrl}
          alt={popup.imageAlt ?? ''}
          className="mx-auto block h-auto max-w-full rounded-[4px] object-contain"
        />
      );
      return popup.linkUrl ? (
        <a
          href={popup.linkUrl}
          onClick={close}
          className="block cursor-pointer"
        >
          {img}
        </a>
      ) : (
        img
      );
    }
    if (popup.popupType === 'CONTENT') {
      return (
        <div className="flex flex-col gap-[12px]">
          {popup.contentHtml ? (
            <TiptapContent
              html={popup.contentHtml}
              className="text-[#111827]! prose-p:text-[#111827]! prose-li:text-[#111827]!"
            />
          ) : (
            <p>내용이 없습니다.</p>
          )}
          {popup.buttonLabel && popup.linkUrl && (
            <a
              href={popup.linkUrl}
              onClick={close}
              className="mt-[4px] self-start rounded-[6px] bg-[#256ef4] px-[20px] py-[12px] font-medium text-white no-underline hover:opacity-90"
            >
              {popup.buttonLabel}
            </a>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/55 p-[16px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="home-popup-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div ref={dialogRef} tabIndex={-1} className="flex max-h-[calc(100vh-32px)] w-full max-w-[640px] flex-col overflow-hidden rounded-[8px] bg-white shadow-[0_20px_48px_rgba(0,0,0,0.25)] outline-none medium:rounded-[12px]">
        <div className="flex items-center justify-between border-b border-[#e4e4e4] p-[16px] large:p-[24px]">
          <h2 id="home-popup-title" className="m-0 text-[18px] leading-[1.5] font-semibold text-[#1e2124]">
            {isSingle ? visiblePopups[0].title : '알림'}
          </h2>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-[6px] border-0 bg-transparent p-[4px] text-[#6d7882] hover:bg-[#f4f5f6] hover:text-[#1e2124]"
            onClick={close}
            aria-label="팝업 닫기"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-[16px] large:p-[24px]">
          {isSingle ? (
            renderPopupBody(visiblePopups[0])
          ) : (
            <Carousel
              slides={visiblePopups.map((p) => (
                <div key={p.id} className="flex flex-col gap-[8px]">
                  <h3 className="m-0 text-[16px] leading-[1.5] font-semibold text-[#1e2124]">{p.title}</h3>
                  {renderPopupBody(p)}
                </div>
              ))}
              options={DEFAULT_SLIDE_OPTIONS}
              ariaLabel="메인 팝업"
            />
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-[12px] border-t border-[#e4e4e4] bg-[#f8f8f8] px-[16px] py-[12px] text-[14px] leading-[1.5] large:px-[24px]">
          <label className="inline-flex cursor-pointer items-center gap-[8px] text-[#464c53]">
            <input
              type="checkbox"
              checked={hideToday}
              onChange={(e) => setHideToday(e.target.checked)}
            />
            <span>오늘 하루 보지 않기</span>
          </label>
          <button
            type="button"
            className="rounded-[6px] border border-[#cdd1d5] bg-white px-[16px] py-[8px] text-[14px] leading-[1.5] text-[#1e2124] hover:bg-[#f4f5f6]"
            onClick={close}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
