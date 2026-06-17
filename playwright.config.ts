import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

import { defineConfig, devices } from '@playwright/test';

// 루트 .env 파일을 Playwright 프로세스에 로드 (Next.js 서버와 별개 프로세스이므로 수동 로드 필요)
const envPath = resolve(process.cwd(), '.env');
if (existsSync(envPath)) {
  readFileSync(envPath, 'utf-8')
    .split('\n')
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 1) return;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    });
}

/**
 * E2E 테스트 설정.
 * 로컬 실행: admin(3001) + web(3000) 개발 서버가 미리 실행되어 있어야 함.
 * CI 통합: Stage 8 (Docker + CI/CD)에서 서버 자동 기동과 함께 추가 예정.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
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
    {
      name: 'demo-smoke',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.DEMO_E2E_BASE_URL ?? 'http://localhost:3000',
      },
      testMatch: '**/demo/**/*.spec.ts',
    },
  ],
});
