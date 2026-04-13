'use client';

import type { ReactNode } from 'react';

import { Footer, Header, Masthead, SkipLink } from 'krds-react';
import type { FooterLink } from 'krds-react';

import type { FilteredMenuItem } from '@/entities/navigation/lib/filterMenuItems';
import { getMenuItemHref } from '@/entities/navigation/lib/getMenuItemHref';

interface PageLayoutProps {
  children: ReactNode;
  headerMenuItems: FilteredMenuItem[];
  footerMenuItems: FilteredMenuItem[];
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
          sections: item.children.map((child) => ({
            type: 'link' as const,
            id: child.id,
            label: child.label,
            href: getMenuItemHref(child),
            isExternal: child.itemType === 'EXTERNAL',
          })),
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
            items: item.children.length > 0
              ? item.children.map((child) => ({
                  type: 'link' as const,
                  id: child.id,
                  label: child.label,
                  href: getMenuItemHref(child),
                  isExternal: child.itemType === 'EXTERNAL',
                }))
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
  }));
}

export function PageLayout({ children, headerMenuItems, footerMenuItems }: PageLayoutProps) {
  const hasHeaderMenu = headerMenuItems.length > 0;

  return (
    <>
      <SkipLink targetId="main-content">본문 바로가기</SkipLink>
      <Masthead text="이 누리집은 대한민국 공식 전자정부 누리집입니다." />
      <Header>
        <Header.Container>
          <Header.Branding logoHref="/" logoAltText="Simple CMS" />
        </Header.Container>
        {hasHeaderMenu && (
          <Header.MainMenu
            desktop={buildDesktopMenu(headerMenuItems)}
            mobile={buildMobileMenu(headerMenuItems)}
          />
        )}
      </Header>
      <main id="main-content">
        {children}
      </main>
      <Footer
        links={footerMenuItems.length > 0 ? buildFooterLinks(footerMenuItems) : undefined}
        copyright="© Simple CMS. All rights reserved."
        hideQuickLinks
        hideIdentifier
      />
    </>
  );
}
