import { defineConfig, devices } from '@playwright/test';

/**
 * E2E 테스트 설정.
 * 로컬 실행: admin(3001) + web(3000) 개발 서버가 미리 실행되어 있어야 함.
 * CI 통합: Stage 8 (Docker + CI/CD)에서 서버 자동 기동과 함께 추가 예정.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'html',
  timeout: 30_000,

  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'admin',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3001',
      },
      testMatch: '**/admin/**/*.spec.ts',
    },
    {
      name: 'web',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://localhost:3000',
      },
      testMatch: '**/web/**/*.spec.ts',
    },
    {
      name: 'golden-flow',
      use: {
        ...devices['Desktop Chrome'],
      },
      testMatch: '**/golden-flow.spec.ts',
    },
  ],
});
