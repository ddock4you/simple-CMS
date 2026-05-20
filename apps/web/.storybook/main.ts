import type { StorybookConfig } from '@storybook/nextjs-vite';

const config: StorybookConfig = {
  framework: '@storybook/nextjs-vite',
  stories: ['../src/**/*.stories.@(ts|tsx|mdx)'],
  addons: ['@storybook/addon-vitest'],
  typescript: {
    check: false,
  },
  // 시연 배포는 sub-directory(`/_cms/storybook/web/`)에서 서빙되므로
  // build 시 base path가 명시 안 되면 asset이 root-relative `/assets/...`로
  // fetch되어 404. bundle-storybooks.mjs가 STORYBOOK_BASE_PATH 환경변수로 전달.
  // 로컬 dev / 일반 빌드(미설정)는 기본 `/` 유지 → 영향 0.
  async viteFinal(viteConfig) {
    if (process.env.STORYBOOK_BASE_PATH) {
      viteConfig.base = process.env.STORYBOOK_BASE_PATH;
    }
    return viteConfig;
  },
};

export default config;
