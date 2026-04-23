import React, { useEffect, useRef, type ReactNode } from 'react';
import type { Decorator } from '@storybook/react';

export interface FetchMockEntry {
  status: number;
  body: unknown;
}

export type FetchMockMap = Record<string, FetchMockEntry>;

interface FetchStubProps {
  mocks: FetchMockMap | undefined;
  children: ReactNode;
}

function FetchStub({ mocks, children }: FetchStubProps) {
  const originalFetchRef = useRef<typeof window.fetch | null>(null);

  useEffect(() => {
    if (!mocks) return;

    originalFetchRef.current = window.fetch;
    const original = originalFetchRef.current;

    window.fetch = async (input, init) => {
      const urlStr =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : input.url;

      const matchKey = Object.keys(mocks).find((key) => urlStr.includes(key));

      if (matchKey) {
        const { status, body } = mocks[matchKey];
        return new Response(JSON.stringify(body), {
          status,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return original(input, init);
    };

    return () => {
      if (originalFetchRef.current) {
        window.fetch = originalFetchRef.current;
        originalFetchRef.current = null;
      }
    };
  }, [mocks]);

  return React.createElement(React.Fragment, null, children);
}

/**
 * Stage 7j — `window.fetch`를 일시 override하는 Storybook decorator.
 *
 * MSW 대체 수단 (msw-storybook-addon v2.0.7이 addon-vitest Playwright browser mode와
 * 비호환이 확인됨, Stage 7h). Story parameter에 `{ [path-substring]: { status, body } }`
 * 맵을 선언하면 path가 포함된 fetch 요청을 intercept하여 mock Response를 반환한다.
 *
 * 응답 body 포맷은 admin fetchClient 표준(`{ success, data?, error? }`)에 맞춘다.
 * unmount 시 원본 fetch 복원.
 *
 * Hooks는 내부 `FetchStub` 컴포넌트로 추출 (react-hooks/rules-of-hooks).
 */
export const fetchStubDecorator: Decorator = (Story, ctx) => {
  const mocks = ctx.parameters.fetchMock as FetchMockMap | undefined;
  return React.createElement(FetchStub, { mocks }, React.createElement(Story));
};
