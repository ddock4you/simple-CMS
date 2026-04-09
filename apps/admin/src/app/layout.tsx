import type { Metadata } from 'next';
import { Geist } from 'next/font/google';

import { Toaster } from '@/shared/ui/sonner';
import { cn } from '@/shared/lib/utils';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

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
    <html lang="ko" className={cn('font-sans', geist.variable)}>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
