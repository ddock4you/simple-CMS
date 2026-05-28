'use client';

import type { ReactNode } from 'react';

import { Footer, Header, Masthead, SkipLink } from 'krds-react';
import type {
  FooterBottomLink,
  FooterLink,
  FooterQuickLink,
  FooterSocialLink,
} from 'krds-react';
import {
  DEFAULT_SITE_FOOTER_IDENTIFIER_TEXT,
  type SiteFooterConfig,
} from '@simple-cms/types';

import type { FilteredMenuItem } from '@/entities/navigation/lib/filterMenuItems';
import { getMenuItemHref } from '@/entities/navigation/lib/getMenuItemHref';
import type { Branding } from '@/shared/lib/brandingCache';

import { HeaderBranding } from './HeaderBranding';
import { RightSidebar } from './RightSidebar';

interface PageLayoutProps {
  children: ReactNode;
  headerMenuItems: FilteredMenuItem[];
  footerMenuItems: FilteredMenuItem[];
  rightSidebar: { name: string; items: FilteredMenuItem[] } | null;
  branding: Branding;
  footerConfig: SiteFooterConfig;
}

function buildDesktopMenu(items: FilteredMenuItem[]) {
  return {
    items: items.map((item) => {
      const href = getMenuItemHref(item);
      const isExternal = item.itemType === 'EXTERNAL';

      if (item.children.length > 0) {
        return {
          type: 'dropdown' as const,
          id: item.id,
          label: item.label,
          sections: item.children.map((child) => {
            // 3depth: children이 있으면 DesktopSubMenu 타입 사용
            if (child.children.length > 0) {
              return {
                type: 'menu' as const,
                id: child.id,
                label: child.label,
                href: getMenuItemHref(child),
                isExternal: child.itemType === 'EXTERNAL',
                items: child.children.map((grandchild) => ({
                  id: grandchild.id,
                  label: grandchild.label,
                  href: getMenuItemHref(grandchild),
                  isExternal: grandchild.itemType === 'EXTERNAL',
                })),
              };
            }
            return {
              type: 'link' as const,
              id: child.id,
              label: child.label,
              href: getMenuItemHref(child),
              isExternal: child.itemType === 'EXTERNAL',
            };
          }),
        };
      }

      return {
        type: 'link' as const,
        id: item.id,
        label: item.label,
        href,
        isExternal,
      };
    }),
  };
}

function buildMobileMenu(items: FilteredMenuItem[]) {
  return {
    body: {
      mainItems: items.map((item) => ({
        id: item.id,
        label: item.label,
        panels: [
          {
            label: item.label,
            items:
              item.children.length > 0
                ? item.children.map((child) => {
                    // 3depth: children이 있으면 MobilePanelDepth3 타입 사용
                    if (child.children.length > 0) {
                      return {
                        type: 'depth3' as const,
                        id: child.id,
                        label: child.label,
                        items: child.children.map((grandchild) => ({
                          type: 'link' as const,
                          id: grandchild.id,
                          label: grandchild.label,
                          href: getMenuItemHref(grandchild),
                          isExternal: grandchild.itemType === 'EXTERNAL',
                        })),
                      };
                    }
                    return {
                      type: 'link' as const,
                      id: child.id,
                      label: child.label,
                      href: getMenuItemHref(child),
                      isExternal: child.itemType === 'EXTERNAL',
                    };
                  })
                : [
                    {
                      type: 'link' as const,
                      id: `${item.id}-self`,
                      label: item.label,
                      href: getMenuItemHref(item),
                      isExternal: item.itemType === 'EXTERNAL',
                    },
                  ],
          },
        ],
      })),
    },
  };
}

function buildFooterLinks(items: FilteredMenuItem[]): FooterLink[] {
  return items.map((item) => ({
    text: item.label,
    href: getMenuItemHref(item),
    target: item.openInNewTab ? ('_blank' as const) : ('_self' as const),
    rel: item.openInNewTab ? 'noopener noreferrer' : undefined,
  }));
}

function buildFooterQuickLinks(
  items: SiteFooterConfig['quickLinks'],
): FooterQuickLink[] {
  return items.map((item) => ({
    title: item.title,
    onClick: () => {
      if (item.openInNewTab) {
        window.open(item.url, '_blank', 'noopener,noreferrer');
        return;
      }
      window.location.href = item.url;
    },
  }));
}

function getLinkTarget(openInNewTab?: boolean): '_blank' | '_self' {
  return openInNewTab ? '_blank' : '_self';
}

function getLinkRel(openInNewTab?: boolean): string | undefined {
  return openInNewTab ? 'noopener noreferrer' : undefined;
}

function buildFooterSocialLinks(
  items: SiteFooterConfig['socialLinks'],
): FooterSocialLink[] {
  return items.map((item) => ({
    platform: item.platform,
    href: item.href,
    target: getLinkTarget(item.openInNewTab),
    rel: getLinkRel(item.openInNewTab),
  }));
}

function buildFooterBottomLinks(
  items: SiteFooterConfig['bottomLinks'],
): FooterBottomLink[] {
  return items.map((item) => ({
    text: item.text,
    href: item.href,
    target: getLinkTarget(item.openInNewTab),
    rel: getLinkRel(item.openInNewTab),
    isHighlighted: item.isHighlighted,
  }));
}

export function PageLayout({
  children,
  headerMenuItems,
  footerMenuItems,
  rightSidebar,
  branding,
  footerConfig,
}: PageLayoutProps) {
  const hasHeaderMenu = headerMenuItems.length > 0;
  const hasRightSidebar = !!rightSidebar && rightSidebar.items.length > 0;

  return (
    <>
      <SkipLink targetId="main-content">본문 바로가기</SkipLink>
      <Masthead text="이 누리집은 대한민국 공식 전자정부 누리집입니다." />
      <Header>
        <Header.Container>
          {/*
            KRDS Header.Branding 대신 커스텀 HeaderBranding (Stage 7l).
            KRDS 원본은 children을 .logo 밖에 렌더하므로 로고 이미지를
            클릭 가능 영역(<a>) 안에 배치하지 못한다.
            Stage 7d RightSidebar/SubpageSideNavigation 동일 패턴 (KRDS DOM 클래스 차용).
          */}
          <HeaderBranding branding={branding} />
        </Header.Container>
        {hasHeaderMenu && (
          <Header.MainMenu
            desktop={buildDesktopMenu(headerMenuItems)}
            mobile={buildMobileMenu(headerMenuItems)}
          />
        )}
      </Header>
      {hasRightSidebar ? (
        <div className="krds-container page-with-right-sidebar">
          <main id="main-content" className="page-main">
            {children}
          </main>
          <RightSidebar
            menuName={rightSidebar.name}
            items={rightSidebar.items}
          />
        </div>
      ) : (
        <main id="main-content">{children}</main>
      )}
      <Footer
        quickLinks={
          footerConfig.hideQuickLinks
            ? undefined
            : buildFooterQuickLinks(footerConfig.quickLinks)
        }
        address={footerConfig.address ?? undefined}
        contacts={footerConfig.contacts}
        links={
          footerMenuItems.length > 0
            ? buildFooterLinks(footerMenuItems)
            : undefined
        }
        socialLinks={buildFooterSocialLinks(footerConfig.socialLinks)}
        bottomLinks={buildFooterBottomLinks(footerConfig.bottomLinks)}
        copyright={
          footerConfig.copyright ??
          `© ${branding.siteName}. All rights reserved.`
        }
        identifierText={
          footerConfig.identifierText ?? DEFAULT_SITE_FOOTER_IDENTIFIER_TEXT
        }
        hideQuickLinks={footerConfig.hideQuickLinks}
        hideIdentifier={footerConfig.hideIdentifier}
        defaultLinkTarget="_self"
      />
    </>
  );
}
