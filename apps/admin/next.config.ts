import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@simple-cms/types', '@simple-cms/db'],
};

export default nextConfig;
