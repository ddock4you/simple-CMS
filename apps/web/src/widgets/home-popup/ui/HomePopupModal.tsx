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
          className="home-popup-image"
        />
      );
      return popup.linkUrl ? (
        <a
          href={popup.linkUrl}
          onClick={close}
          className="home-popup-image-link"
        >
          {img}
        </a>
      ) : (
        img
      );
    }
    if (popup.popupType === 'CONTENT') {
      return (
        <div className="home-popup-content-body">
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
              className="home-popup-button"
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
      className="home-popup-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="home-popup-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div ref={dialogRef} tabIndex={-1} className="home-popup-panel">
        <div className="home-popup-header">
          <h2 id="home-popup-title" className="home-popup-title">
            {isSingle ? visiblePopups[0].title : '알림'}
          </h2>
          <button
            type="button"
            className="home-popup-close"
            onClick={close}
            aria-label="팝업 닫기"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="home-popup-body">
          {isSingle ? (
            renderPopupBody(visiblePopups[0])
          ) : (
            <Carousel
              slides={visiblePopups.map((p) => (
                <div key={p.id} className="home-popup-slide">
                  <h3 className="home-popup-slide-title">{p.title}</h3>
                  {renderPopupBody(p)}
                </div>
              ))}
              options={DEFAULT_SLIDE_OPTIONS}
              ariaLabel="메인 팝업"
            />
          )}
        </div>

        <div className="home-popup-footer">
          <label className="home-popup-hide-today">
            <input
              type="checkbox"
              checked={hideToday}
              onChange={(e) => setHideToday(e.target.checked)}
            />
            <span>오늘 하루 보지 않기</span>
          </label>
          <button
            type="button"
            className="home-popup-close-btn"
            onClick={close}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
