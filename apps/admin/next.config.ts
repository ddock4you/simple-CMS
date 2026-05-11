import path from 'node:path';
import dotenv from 'dotenv';
import type { NextConfig } from 'next';

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
        basePath: '/_cms/admin',
        assetPrefix: '/_cms/admin',
        images: { unoptimized: true },
      }
    : {}),
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
