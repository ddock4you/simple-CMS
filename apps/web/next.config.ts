import path from 'node:path';
import dotenv from 'dotenv';
import type { NextConfig } from 'next';

// 모노레포 루트의 .env를 로드
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isDemoMode = process.env.DEMO_MODE === 'true';
const adminRewriteUrl = process.env.NEXT_PUBLIC_ADMIN_REWRITE_URL;

const nextConfig: NextConfig = {
  transpilePackages: ['@simple-cms/types', '@simple-cms/db', '@simple-cms/editor'],
  // Docker self-host: standalone 산출물 + 모노레포 workspace deps tracing.
  // outputFileTracingRoot가 없으면 .next/standalone에 @simple-cms/* 패키지가 빠짐.
  output: 'standalone',
  outputFileTracingRoot: path.resolve(__dirname, '../../'),
  // next/image 점진 도입(Stage 3-2)을 위한 remotePatterns. /uploads/* 는 same-origin이라
  // 자동 허용되어 별도 패턴 불필요. Supabase Storage 도메인은 wildcard로 등록.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // dev 서버를 LAN IP(예: 모바일 디바이스에서 192.168.x.x)로 접속할 때 chunk/HMR이
  // cross-origin으로 차단되어 hydration이 실패하는 문제를 해결.
  // Next.js 15.2+ top-level 옵션. wildcard 지원.
  allowedDevOrigins: [
    '192.168.0.233',
    '192.168.0.*',
    '192.168.*.*',
    '10.*.*.*',
    '*.local',
  ],
  // 시연 모드: admin을 단일 도메인(/_cms/admin/*)에 프록시.
  // emdashcms.com 패턴과 동일하게 단일 origin을 유지해 세션 쿠키(Path=/)를 admin/web 양쪽에서 공유.
  //
  // root path `/_cms/admin`(no trailing slash + path*=빈 값) 자체를 명시적으로 dashboard로
  // 매핑한다. 명시 처리가 없으면 path*=빈 매칭이 destination을 trailing slash 형태로 만들어
  // Vercel/Next.js의 자동 trailing slash 정규화와 충돌하면서 `/_cms/admin` ↔ `/_cms/admin`
  // 308 무한 redirect 루프가 발생.
  ...(isDemoMode && adminRewriteUrl
    ? {
        async rewrites() {
          return [
            {
              source: '/_cms/admin',
              destination: `${adminRewriteUrl}/_cms/admin/dashboard`,
            },
            {
              source: '/_cms/admin/:path*',
              destination: `${adminRewriteUrl}/_cms/admin/:path*`,
            },
          ];
        },
      }
    : {}),
};

export default nextConfig;
