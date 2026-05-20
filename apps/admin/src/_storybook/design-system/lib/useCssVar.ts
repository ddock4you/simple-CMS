'use client';

import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

import { useColorMode } from './colorMode';

/**
 * 토큰 카드가 자기 위치(`.dark` ancestor 여부)에서 보이는 CSS variable 실제 값을 runtime에 읽는다.
 * stories 파일에는 토큰 이름만 두고 값은 globals.css가 단일 출처가 되도록 한다.
 *
 * - SSR/Storybook Server 빌드에서 `window`가 없으면 빈 문자열 반환
 * - `useColorMode`를 deps에 포함시켜 light/dark 토글 시 재측정
 */
export function useCssVar(name: string): { ref: RefObject<HTMLDivElement | null>; value: string } {
  const ref = useRef<HTMLDivElement | null>(null);
  const [value, setValue] = useState<string>('');
  const mode = useColorMode();

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    const el = ref.current;
    if (!el) return;
    const next = getComputedStyle(el).getPropertyValue(name).trim();
    setValue(next);
  }, [name, mode]);

  return { ref, value };
}
