/**
 * Vitest 단위 테스트 프로젝트(jsdom) 공통 옵션.
 * 각 앱의 `vitest.config.ts`에서 `projects` 배열의 `test` 필드로 병합해 사용한다.
 *
 * alias/resolve는 앱마다 다르므로 여기서 설정하지 않는다.
 * 앱의 `vite.config.ts`를 `mergeConfig`로 병합하는 방식을 권장.
 */
export const unitProjectDefaults = {
  environment: 'jsdom',
  globals: true,
  include: ['src/**/*.test.{ts,tsx}'],
  exclude: [
    '**/node_modules/**',
    '**/dist/**',
    '**/.next/**',
    'src/**/*.stories.*',
  ],
};

/**
 * 각 앱 `vitest.config.ts`의 `test.coverage`로 병합.
 * Stage 7g에서 CI 도입 시 report 형식/threshold를 추가할 수 있다.
 */
export const coverageDefaults = {
  provider: 'v8',
  reporter: ['text', 'html'],
  include: ['src/**/*.{ts,tsx}'],
  exclude: [
    'src/**/*.stories.*',
    'src/**/*.test.*',
    'src/**/*.d.ts',
    'src/**/*.types.ts',
  ],
};
