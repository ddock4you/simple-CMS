import path from 'node:path';
import dotenv from 'dotenv';
import type { NextConfig } from 'next';
import { DEMO_ADMIN_BASE_PATH } from '@simple-cms/types';

// 모노레포 루트의 .env를 로드
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isDemoMode = process.env.DEMO_MODE === 'true';

const nextConfig: NextConfig = {
  transpilePackages: ['@simple-cms/types', '@simple-cms/db'],
  // Docker self-host: standalone 산출물 + 모노레포 workspace deps tracing.
  // outputFileTracingRoot가 없으면 .next/standalone에 @simple-cms/* 패키지가 빠짐.
  output: 'standalone',
  outputFileTracingRoot: path.resolve(__dirname, '../../'),
  // 시연 모드: web 프로젝트의 rewrites가 /_cms/admin/* 경로로 프록시하므로
  // admin 자체를 그 경로 아래에서 동작하도록 basePath/assetPrefix 부여.
  // images.unoptimized: basePath 하의 Next Image Optimization API 안정성 확보.
  ...(isDemoMode
    ? {
        basePath: DEMO_ADMIN_BASE_PATH,
        assetPrefix: DEMO_ADMIN_BASE_PATH,
        images: { unoptimized: true },
      }
    : {
        // 운영 모드 next/image 점진 도입: Supabase Storage URL 허용.
        // /uploads/* 같은 same-origin 경로는 자동 허용되어 별도 패턴 불필요.
        images: {
          remotePatterns: [
            {
              protocol: 'https',
              hostname: '**.supabase.co',
              pathname: '/storage/v1/object/public/**',
            },
          ],
        },
      }),
  async redirects() {
    return [
      {
        source: '/home/popups/:path*',
        destination: '/popups/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
