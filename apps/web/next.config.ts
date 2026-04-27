import path from 'node:path';
import dotenv from 'dotenv';
import type { NextConfig } from 'next';

// 모노레포 루트의 .env를 로드
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const nextConfig: NextConfig = {
  transpilePackages: ['@simple-cms/types', '@simple-cms/db', '@simple-cms/editor'],
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
};

export default nextConfig;
