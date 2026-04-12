import path from 'node:path';
import dotenv from 'dotenv';
import type { NextConfig } from 'next';

// 모노레포 루트의 .env를 로드
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const nextConfig: NextConfig = {
  transpilePackages: ['@simple-cms/types', '@simple-cms/db', '@simple-cms/editor'],
};

export default nextConfig;
