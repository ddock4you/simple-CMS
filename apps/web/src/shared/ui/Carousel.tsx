'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Swiper as SwiperInstance } from 'swiper';
import { A11y, Autoplay, Keyboard, Navigation, Pagination } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';

import type { SlideOptions } from '@simple-cms/types';

// Swiper 기본 CSS + 필요한 모듈 CSS (Navigation/Pagination용)
import 'swiper/css';
import 'swiper/css/pagination';

interface CarouselProps {
  /** 각 슬라이드의 React 노드 배열 */
  slides: ReactNode[];
  /** 슬라이드 옵션 (admin에서 설정한 값) */
  options: SlideOptions;
  /** 디바이스별 slidesPerView (기본: 1) */
  breakpoints?: Record<number, { slidesPerView: number; spaceBetween?: number }>;
  /** loop 모드 (기본 true) */
  loop?: boolean;
  /** 기본 slidesPerView (breakpoints가 없는 경우, 기본 1) */
  slidesPerView?: number;
  /** 기본 spaceBetween (기본 16px) */
  spaceBetween?: number;
  /** 컨테이너에 적용할 추가 클래스 */
  className?: string;
  /** 접근성 label */
  ariaLabel?: string;
}

/**
 * Swiper 기반 공통 캐러셀.
 *
 * - options.showPrevNext: 커스텀 prev/next 버튼 표시
 * - options.showDots: swiper의 기본 pagination (clickable dots) 표시
 * - options.showPlayPause: play/pause 커스텀 토글 버튼 표시
 *   - options.autoPlay=true면 초기에 재생 상태로 시작
 *   - options.autoPlayInterval: 전환 간격 (ms)
 *
 * 접근성: a11y 모듈, keyboard 모듈, prefers-reduced-motion 존중, pauseOnMouseEnter.
 */
export function Carousel({
  slides,
  options,
  breakpoints,
  loop = true,
  slidesPerView = 1,
  spaceBetween = 16,
  className,
  ariaLabel,
}: CarouselProps) {
  const swiperRef = useRef<SwiperInstance | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(
    options.showPlayPause && options.autoPlay,
  );

  // 첫 방문 시 Pretendard 폰트/이미지/KRDS Header 등의 async layout shift로
  // swiper가 mount 시점 부모 너비 측정에 실패하여 slide.style.width가 비정상 큰 값
  // (예: 22369600px)으로 박히는 회귀를 방어. 다층 트리거로 robustness 확보:
  //   1) ResizeObserver: 부모 element width 변화 시마다 재측정 (가장 신뢰)
  //   2) window 'load' 이벤트: 모든 리소스(폰트/이미지) 로드 완료 시점
  //   3) RAF 2회: 첫 paint 직후 안정화된 layout 측정
  // swiper.update()는 idempotent라 중복 호출 안전. swiper의 observer 옵션은
  // 사용하지 않음 — 내부 observer + update가 race 시 22M로 갱신되는 케이스 회피.
  useEffect(() => {
    const safeUpdate = () => {
      const swiper = swiperRef.current;
      if (swiper && !swiper.destroyed) swiper.update();
    };

    // 1) RAF 2회 — 첫 paint 직후 안정화된 layout 측정
    let raf1 = 0;
    let raf2 = 0;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(safeUpdate);
    });

    // 2) window 'load' — 모든 리소스(폰트/이미지) 로드 완료 시점
    let onLoad: (() => void) | null = null;
    let loadTimeout = 0;
    if (document.readyState === 'complete') {
      loadTimeout = window.setTimeout(safeUpdate, 0);
    } else {
      onLoad = safeUpdate;
      window.addEventListener('load', onLoad);
    }

    // 3) ResizeObserver — 부모 element width 변화 시마다 재측정 (가장 신뢰)
    let ro: ResizeObserver | null = null;
    const el = containerRef.current;
    if (el && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(safeUpdate);
      ro.observe(el);
    }

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      if (loadTimeout) clearTimeout(loadTimeout);
      if (onLoad) window.removeEventListener('load', onLoad);
      if (ro) ro.disconnect();
    };
  }, []);

  const modules = [A11y, Keyboard];
  if (options.showPrevNext) modules.push(Navigation);
  if (options.showDots) modules.push(Pagination);
  if (options.showPlayPause) modules.push(Autoplay);

  const autoplayConfig =
    options.showPlayPause && options.autoPlay
      ? {
          delay: Math.max(1000, Math.min(options.autoPlayInterval, 30000)),
          pauseOnMouseEnter: true,
          disableOnInteraction: false,
        }
      : false;

  const handlePrev = useCallback(() => {
    swiperRef.current?.slidePrev();
  }, []);

  const handleNext = useCallback(() => {
    swiperRef.current?.slideNext();
  }, []);

  const handleTogglePlay = useCallback(() => {
    const instance = swiperRef.current;
    if (!instance?.autoplay) return;
    if (isPlaying) {
      instance.autoplay.stop();
      setIsPlaying(false);
    } else {
      instance.autoplay.start();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  return (
    <div
      ref={containerRef}
      className={['krds-carousel', className].filter(Boolean).join(' ')}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
    >
      <Swiper
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
        }}
        modules={modules}
        slidesPerView={slidesPerView}
        spaceBetween={spaceBetween}
        loop={loop && slides.length > 1}
        watchOverflow
        keyboard={{ enabled: true, onlyInViewport: true }}
        a11y={{
          enabled: true,
          prevSlideMessage: '이전 슬라이드',
          nextSlideMessage: '다음 슬라이드',
          paginationBulletMessage: '{{index}}번 슬라이드로 이동',
        }}
        navigation={false}
        pagination={
          options.showDots
            ? { clickable: true, el: '.krds-carousel-dots' }
            : false
        }
        autoplay={autoplayConfig}
        breakpoints={breakpoints}
      >
        {slides.map((slide, index) => (
          <SwiperSlide key={index}>{slide}</SwiperSlide>
        ))}
      </Swiper>

      {(options.showPrevNext ||
        options.showPlayPause ||
        options.showDots) && (
        <div className="krds-carousel-controls">
          {options.showPrevNext && (
            <button
              type="button"
              className="krds-carousel-btn"
              onClick={handlePrev}
              aria-label="이전 슬라이드"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
          )}

          {options.showPlayPause && (
            <button
              type="button"
              className="krds-carousel-btn krds-carousel-btn-play"
              onClick={handleTogglePlay}
              aria-label={isPlaying ? '슬라이드 정지' : '슬라이드 재생'}
              aria-pressed={isPlaying}
            >
              {isPlaying ? (
                <Pause className="size-5" aria-hidden="true" />
              ) : (
                <Play className="size-5" aria-hidden="true" />
              )}
            </button>
          )}

          {options.showDots && (
            <div
              className="krds-carousel-dots"
              role="group"
              aria-label="슬라이드 인디케이터"
            />
          )}

          {options.showPrevNext && (
            <button
              type="button"
              className="krds-carousel-btn"
              onClick={handleNext}
              aria-label="다음 슬라이드"
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
