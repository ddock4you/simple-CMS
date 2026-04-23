'use client';

import Link from 'next/link';

import type { Branding } from '@/shared/lib/brandingCache';

/**
 * KRDS Header.Branding의 DOM 구조를 차용한 커스텀 브랜딩 컴포넌트 (Stage 7l).
 *
 * KRDS 원본 `<Header.Branding>`은 `children`을 `.logo`(<h2>) **밖**에 렌더하므로
 * 로고 이미지를 클릭 가능 영역(`<a href="/">`) 안에 두려면 그대로 사용 불가.
 * Stage 7d `RightSidebar`/`SubpageSideNavigation` 선례 동일 — KRDS DOM 클래스
 * (`.header-branding > h2.logo > a`)를 차용한 커스텀 JSX로 대체.
 *
 * 폴백 동작: logoUrl 없으면 sr-only 대신 시각적 사이트명 텍스트(`.header-logo-text`).
 * KRDS 메이저 업데이트 시 이 컴포넌트와 7d의 RightSidebar/SubpageSideNavigation 3곳을 함께 점검.
 */
export function HeaderBranding({
  branding,
  searchHref = '/search',
}: {
  branding: Branding;
  searchHref?: string;
}) {
  return (
    <div className="header-branding">
      <h2 className="logo">
        <Link href="/">
          {branding.logoUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={branding.logoUrl}
                alt=""
                className="header-logo-image"
              />
              <span className="sr-only">{branding.logoAlt}</span>
            </>
          ) : (
            <span className="header-logo-text">{branding.siteName}</span>
          )}
        </Link>
      </h2>
      <Link
        href={searchHref}
        className="header-search-link"
        aria-label="검색"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </Link>
    </div>
  );
}
