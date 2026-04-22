import { fileURLToPath, URL } from 'node:url';
import { defineConfig, mergeConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';

import { coverageDefaults, unitProjectDefaults } from '@simple-cms/config/vitest/base';
import { browserDefaults } from '@simple-cms/config/vitest/browser';

import viteConfig from './vite.config';

const storybookConfigDir = fileURLToPath(new URL('./.storybook', import.meta.url));
const storybookSetupFile = fileURLToPath(new URL('./.storybook/vitest.setup.ts', import.meta.url));

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      coverage: coverageDefaults,
      projects: [
        {
          extends: true,
          test: {
            name: 'unit',
            ...unitProjectDefaults,
          },
        },
        {
          extends: true,
          plugins: [storybookTest({ configDir: storybookConfigDir })],
          test: {
            name: 'storybook',
            browser: {
              ...browserDefaults,
              provider: playwright({}),
            },
            setupFiles: [storybookSetupFile],
          },
        },
      ],
    },
  }),
);
