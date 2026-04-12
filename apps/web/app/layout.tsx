import type { Metadata } from 'next';

import 'krds-react/dist/index.css';

import { PageLayout } from '@/widgets/layout/ui/PageLayout';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Simple CMS',
    template: '%s | Simple CMS',
  },
  description: '공개 웹',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          as="style"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>
        <PageLayout>{children}</PageLayout>
      </body>
    </html>
  );
}
