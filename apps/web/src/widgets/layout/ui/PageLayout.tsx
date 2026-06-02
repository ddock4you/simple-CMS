import type { ReactNode } from 'react';

import type { SiteFooterConfig } from '@simple-cms/types';

import type { FilteredMenuItem } from '@/entities/navigation/lib/filterMenuItems';
import type { Branding } from '@/shared/lib/brandingCache';

import { FooterChrome } from './FooterChrome';
import { HeaderChrome } from './HeaderChrome';
import { RightSidebar } from './RightSidebar';

interface PageLayoutProps {
  children: ReactNode;
  headerMenuItems: FilteredMenuItem[];
  footerMenuItems: FilteredMenuItem[];
  rightSidebar: { name: string; items: FilteredMenuItem[] } | null;
  branding: Branding;
  footerConfig: SiteFooterConfig;
}

export function PageLayout({
  children,
  headerMenuItems,
  footerMenuItems,
  rightSidebar,
  branding,
  footerConfig,
}: PageLayoutProps) {
  const hasRightSidebar = !!rightSidebar && rightSidebar.items.length > 0;

  return (
    <>
      <HeaderChrome branding={branding} headerMenuItems={headerMenuItems} />
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
      <FooterChrome
        branding={branding}
        footerMenuItems={footerMenuItems}
        footerConfig={footerConfig}
      />
    </>
  );
}
