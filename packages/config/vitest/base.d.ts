/**
 * .js 파일의 타입 shim. 실제 값은 base.js에 있고, 이 파일은 TypeScript 타입 해석 전용.
 * Vitest config의 projects[].test 에 merge되는 옵션이므로 Record 허용 형태.
 */
export declare const unitProjectDefaults: {
  environment: 'jsdom';
  globals: boolean;
  include: string[];
  exclude: string[];
};

export declare const coverageDefaults: {
  provider: 'v8';
  reporter: string[];
  include: string[];
  exclude: string[];
};
