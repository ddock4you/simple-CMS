/**
 * Storybook/Vitest browser mode 공통 옵션.
 *
 * Vitest v4부터 `provider`는 factory function (`playwright({})`) 형태가 권장된다.
 * `playwright` import는 각 앱의 `vitest.config.ts`에서 수행하고, 여기서는 값만 제공한다.
 *
 * 사용 예:
 * ```ts
 * import { playwright } from '@vitest/browser-playwright';
 * import { browserDefaults } from '@simple-cms/config/vitest/browser';
 *
 * browser: {
 *   ...browserDefaults,
 *   provider: playwright({}),
 * }
 * ```
 */
export const browserInstances = [{ browser: 'chromium' }];

export const browserDefaults = {
  enabled: true,
  headless: true,
  instances: browserInstances,
};
