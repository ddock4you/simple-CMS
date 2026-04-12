'use client';

import type { ReactNode } from 'react';

import { Footer, Header, Masthead, SkipLink } from 'krds-react';

interface PageLayoutProps {
  children: ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  return (
    <>
      <SkipLink targetId="main-content">본문 바로가기</SkipLink>
      <Masthead text="이 누리집은 대한민국 공식 전자정부 누리집입니다." />
      <Header>
        <Header.Container>
          <Header.Branding logoHref="/" logoAltText="Simple CMS" />
        </Header.Container>
      </Header>
      <main id="main-content">
        {children}
      </main>
      <Footer
        copyright="© Simple CMS. All rights reserved."
        hideQuickLinks
        hideIdentifier
      />
    </>
  );
}
