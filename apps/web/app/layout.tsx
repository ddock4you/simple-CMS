import type { Metadata } from 'next';
import { SpeedInsights } from '@vercel/speed-insights/next';

import './krds-normalized.css';

import { getMenusBySlots } from '@/entities/navigation/api/getNavigation';
import { getCachedBranding } from '@/shared/lib/brandingCache';
import { ensureDemoSession } from '@/shared/lib/ensureDemoSession';
import { getCachedFooterConfig } from '@/shared/lib/footerConfigCache';
import { getCurrentPathname } from '@/shared/lib/getCurrentPathname';
import { getSiteUrl } from '@/shared/lib/siteUrl';
import {
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
  serializeJsonLd,
} from '@/shared/lib/structuredData';
import { DemoBanner } from '@/shared/ui/DemoBanner';
import { ErrorReporterMount } from '@/shared/ui/ErrorReporterMount';
import { PageLayout } from '@/widgets/layout/ui/PageLayout';

import './globals.css';

// Footer/branding/site settings are DB-backed but should refresh without redeploy.
// Keep static rendering benefits while allowing ISR to pick up admin changes.
export const revalidate = 60;

/**
 * 동적 메타데이터 (Stage 7l).
 * SiteSettings 기반으로 title/description/icons/openGraph 생성.
 *
 * - title.default + template: SITE_NAME 동적
 * - description: SITE_DESCRIPTION (폴백 '공개 웹')
 * - icons.icon: SITE_FAVICON_MEDIA_ID Media.url + ?v=mediaId (브라우저 favicon 캐시 무효화)
 * - openGraph.images: SITE_OG_IMAGE_MEDIA_ID Media.url, 1200x630 권장
 *
 * brandingCache 실패 시 폴백 객체 반환 — 페이지 렌더 차단 방지.
 * `RootLayout`도 같은 `getCachedBranding()`을 호출하지만 모듈 레벨 TTL 캐시(60s/5s)로 dedup.
 */
export async function generateMetadata(): Promise<Metadata> {
  const branding = await getCachedBranding();

  const metadata: Metadata = {
    title: {
      default: branding.siteName,
      template: `%s | ${branding.siteName}`,
    },
    description: branding.siteDescription,
  };

  if (branding.faviconUrl) {
    // ?v={mediaId}로 cache busting — 동일 바이너리 재업로드는 같은 mediaId라 무효화 발생 안 함 (의도적)
    metadata.icons = {
      icon: `${branding.faviconUrl}?v=${branding.faviconMediaId ?? ''}`,
    };
  }

  if (branding.ogImageUrl) {
    metadata.openGraph = {
      images: [
        {
          url: branding.ogImageUrl,
          width: 1200,
          height: 630,
          alt: branding.siteName,
        },
      ],
    };
  }

  return metadata;
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 시연 모드: cookie 검증 + sessionId 부착, 없으면 splash로 redirect.
  // 운영 모드(DEMO_MODE 미설정): dynamic API(cookies/headers) 호출 자체를 skip하여
  // 페이지 레벨 force-dynamic 해제 시 ISR/static rendering이 동작하도록 보장.
  const isDemoMode = process.env.DEMO_MODE === 'true';
  const demoSession = isDemoMode
    ? await ensureDemoSession(await getCurrentPathname())
    : null;

  const [menus, branding, footerConfig, baseUrl] = await Promise.all([
    getMenusBySlots(['HEADER', 'FOOTER', 'SIDEBAR']),
    getCachedBranding(),
    getCachedFooterConfig(),
    getSiteUrl(),
  ]);
  const headerMenu = menus.HEADER;
  const footerMenu = menus.FOOTER;
  const sidebarMenu = menus.SIDEBAR;

  const organizationJsonLd = buildOrganizationJsonLd({
    siteName: branding.siteName,
    baseUrl,
    logoUrl: branding.logoUrl,
  });
  const websiteJsonLd = buildWebSiteJsonLd({
    siteName: branding.siteName,
    siteDescription: branding.siteDescription,
    baseUrl,
  });

  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(organizationJsonLd),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(websiteJsonLd) }}
        />
      </head>
      <body>
        {demoSession && <DemoBanner expiresAt={demoSession.expiresAt} />}
        <ErrorReporterMount />
        <PageLayout
          headerMenuItems={headerMenu?.items ?? []}
          footerMenuItems={footerMenu?.items ?? []}
          rightSidebar={
            sidebarMenu
              ? { name: sidebarMenu.name, items: sidebarMenu.items }
              : null
          }
          branding={branding}
          footerConfig={footerConfig}
        >
          {children}
        </PageLayout>
        <SpeedInsights />
      </body>
    </html>
  );
}
