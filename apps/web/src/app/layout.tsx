import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Simple CMS',
  description: '공개 웹',
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
