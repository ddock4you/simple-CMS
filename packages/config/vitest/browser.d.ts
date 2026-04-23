/**
 * .js 파일의 타입 shim. 실제 값은 browser.js에 있다.
 */
export declare const browserInstances: Array<{ browser: 'chromium' }>;

export declare const browserDefaults: {
  enabled: boolean;
  headless: boolean;
  instances: Array<{ browser: 'chromium' }>;
};
