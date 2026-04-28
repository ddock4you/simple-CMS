import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
    env: {
      // pure 함수 테스트 시 Prisma 클라이언트 초기화를 통과시키기 위한 더미 URL
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    },
  },
});
