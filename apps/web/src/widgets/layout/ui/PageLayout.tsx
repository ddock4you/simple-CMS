import type { ReactNode } from 'react';

import type { FilteredMenuItem } from '@/entities/navigation/lib/filterMenuItems';
import type { Branding } from '@/shared/lib/brandingCache';
import type { ResolvedSiteFooterConfig } from '@/shared/lib/footerConfigCache';

import { FooterChrome } from './FooterChrome';
import { HeaderChrome } from './HeaderChrome';
import { RightSidebar } from './RightSidebar';

interface PageLayoutProps {
  children: ReactNode;
  headerMenuItems: FilteredMenuItem[];
  footerMenuItems: FilteredMenuItem[];
  rightSidebar: { name: string; items: FilteredMenuItem[] } | null;
  branding: Branding;
  footerConfig: ResolvedSiteFooterConfig;
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
    <div className="flex min-h-dvh flex-col">
      <HeaderChrome branding={branding} headerMenuItems={headerMenuItems} />
      {hasRightSidebar ? (
        <div className="krds-container page-with-right-sidebar grow">
          <main id="main-content" className="page-main">
            {children}
          </main>
          <RightSidebar
            menuName={rightSidebar.name}
            items={rightSidebar.items}
          />
        </div>
      ) : (
        <main id="main-content" className="grow">
          {children}
        </main>
      )}
      <FooterChrome
        branding={branding}
        footerMenuItems={footerMenuItems}
        footerConfig={footerConfig}
      />
    </div>
  );
}
