import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Simple CMS Admin',
  description: '관리자 CMS',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
