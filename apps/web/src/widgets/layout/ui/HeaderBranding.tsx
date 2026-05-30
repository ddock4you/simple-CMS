'use client';

import Link from 'next/link';
import { Header } from 'krds-react';

import type { Branding } from '@/shared/lib/brandingCache';

/**
 * KRDS Header.Branding의 DOM 구조를 차용한 커스텀 브랜딩 컴포넌트 (Stage 7l).
 *
 * KRDS 원본 `<Header.Branding>`은 `children`을 `.logo`(<h2>) **밖**에 렌더하므로
 * 로고 이미지를 클릭 가능 영역(`<a href="/">`) 안에 두려면 그대로 사용 불가.
 * Stage 7d `RightSidebar`/`ContentSideNavigation` 선례 동일 — KRDS DOM 클래스
 * (`.header-branding > h2.logo > a`)를 차용한 커스텀 JSX로 대체.
 *
 * 폴백 동작: logoUrl 없으면 sr-only 대신 시각적 사이트명 텍스트를 표시.
 * KRDS 메이저 업데이트 시 이 컴포넌트와 RightSidebar/ContentSideNavigation을 함께 점검.
 */
export function HeaderBranding({
  branding,
  searchHref = '/search',
  desktopMenuPortalId = 'web-header-desktop-menu',
}: {
  branding: Branding;
  searchHref?: string;
  desktopMenuPortalId?: string;
}) {
  return (
    <div className="header-branding !flex !w-full !items-center !gap-[24px]">
      <h2 className="logo !m-0 !shrink-0">
        <Link
          href="/"
          aria-label={branding.logoAlt}
          className="!flex !h-full !w-full !items-center !bg-none"
        >
          {branding.logoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={branding.logoUrl}
              alt=""
              className="block max-h-full w-auto max-w-[148px] object-contain medium:max-w-[200px]"
            />
          ) : (
            <span className="inline-block whitespace-nowrap text-[16px] leading-[1.3] font-bold text-[#1f2937] medium:text-[18px]">
              {branding.siteName}
            </span>
          )}
        </Link>
      </h2>
      <div
        id={desktopMenuPortalId}
        className="hidden large:block large:min-w-0 large:flex-1"
      />
      <Header.Navi className="ml-auto shrink-0">
        <Link
          href={searchHref}
          className="btn-navi sch navi-row"
          aria-label="통합검색"
        >
          통합검색
        </Link>
      </Header.Navi>
    </div>
  );
}
