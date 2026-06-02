'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { X } from 'lucide-react';

import { SearchInputForm } from './SearchInputForm';

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="search-overlay-title"
      tabIndex={-1}
      className="fixed inset-0 z-[1000] overflow-y-auto bg-[#eef2f7] outline-none"
    >
      <div className="min-h-dvh large:flex large:justify-end">
        <section className="w-full px-[16px] py-[24px] large:h-dvh large:w-auto large:px-[204px] large:py-[160px]">
          <div className="w-full border-b border-[#d6e0eb] pb-[40px] large:w-[792px]">
            <div className="flex flex-col gap-[12px]">
              <h2
                id="search-overlay-title"
                className="m-0 text-[28px] leading-[1.5] font-bold tracking-[0.0357em] text-[#1e2124] large:text-[32px] large:tracking-[0.0313em]"
              >
                검색어를 입력해주세요
              </h2>
              <SearchInputForm
                action="/search"
                inputId="global-search-overlay-input"
                label="통합검색"
                placeholder="검색어를 입력해주세요."
                variant="xlarge"
                className="w-full large:w-[792px]"
              />
            </div>
          </div>
        </section>
        <div className="absolute top-[24px] right-[16px] large:static large:w-[360px] large:pt-[160px]">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-[40px] items-center justify-center text-[#33363d] hover:text-[#1e694e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#256ef4]"
            aria-label="통합검색 닫기"
          >
            <X className="size-[32px] large:size-[40px]" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
