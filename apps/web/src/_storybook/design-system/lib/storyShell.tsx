'use client';

import { useLayoutEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { Decorator } from '@storybook/react';

// KRDS `html { font-size: 62.5% }` + `body { font-size: 1.7rem }` 를 !important로 override.
// useLayoutEffect(paint 전 동기 실행) + <style> inject로 flash 방지.
const RESET_CSS = `
  html { font-size: 16px !important; }
  body { font-size: 16px !important; line-height: 1.5 !important; }
`;

// Tailwind v4가 Storybook Vite 빌드에서 arbitrary value(px-[24px] 등)를 스캔하지 못하는 경우
// CSS 자체가 생성되지 않아 className 방식이 동작하지 않는다.
// KRDS plugin이 theme.spacing을 완전히 override하므로 표준 utility도 안전하지 않다.
// inline style로 직접 지정하여 어떤 CSS 레이어/생성 문제도 우회한다.
const OUTER_STYLE: CSSProperties = {
  paddingTop: 48,
  paddingBottom: 48,
  paddingLeft: 32,
  paddingRight: 32,
};

function StoryShellInner({ children }: { children: ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const style = document.createElement('style');
    style.setAttribute('data-design-system-shell', '');
    style.textContent = RESET_CSS;
    document.head.appendChild(style);

    // ── 디버깅: 실제 적용값 확인 (브라우저 DevTools console에서 확인) ──
    const htmlFs = getComputedStyle(document.documentElement).fontSize;
    const bodyFs = getComputedStyle(document.body).fontSize;
    console.log('[StoryShell] html fontSize (기대 16px):', htmlFs);
    console.log('[StoryShell] body fontSize (기대 16px):', bodyFs);
    if (wrapperRef.current) {
      const cs = getComputedStyle(wrapperRef.current);
      console.log('[StoryShell] wrapper padding (기대 32px / 24px):', {
        top: cs.paddingTop,
        right: cs.paddingRight,
        bottom: cs.paddingBottom,
        left: cs.paddingLeft,
      });
    }

    return () => {
      style.remove();
    };
  }, []);

  return (
    <div ref={wrapperRef} style={OUTER_STYLE}>
      {children}
    </div>
  );
}

export const storyShellDecorator: Decorator = (Story) => (
  <StoryShellInner>
    <Story />
  </StoryShellInner>
);
