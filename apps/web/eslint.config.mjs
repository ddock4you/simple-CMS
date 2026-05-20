import nextConfig from '@simple-cms/config/eslint/next';

const config = [
  ...nextConfig,
  {
    // 시연 build:demo가 동봉하는 Storybook 정적 산출물 — 빌드 결과물이라 lint 제외
    ignores: ['public/_cms/storybook/**'],
  },
];

export default config;
