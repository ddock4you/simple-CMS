'use client';

import { useEffect } from 'react';

interface UseKeyboardShortcutOptions {
  enabled?: boolean;
  preventDefault?: boolean;
}

/**
 * 글로벌 키보드 단축키. mac=metaKey, win/linux=ctrlKey 통합 (mod 키워드).
 *
 * 예: `useKeyboardShortcut('mod+k', () => setOpen(true))`
 *
 * 지원 modifier: mod, shift, alt
 * 키는 e.key와 case-insensitive 비교.
 */
export function useKeyboardShortcut(
  combo: string,
  handler: (e: KeyboardEvent) => void,
  options: UseKeyboardShortcutOptions = {},
) {
  const { enabled = true, preventDefault = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const parts = combo.toLowerCase().split('+').map((p) => p.trim());
    const wantsMod = parts.includes('mod');
    const wantsShift = parts.includes('shift');
    const wantsAlt = parts.includes('alt');
    const key = parts.find(
      (p) => p !== 'mod' && p !== 'shift' && p !== 'alt',
    );
    if (!key) return;

    const isMac =
      typeof navigator !== 'undefined' &&
      /Mac|iPhone|iPad|iPod/.test(navigator.platform);

    const listener = (e: KeyboardEvent) => {
      const modOk = wantsMod ? (isMac ? e.metaKey : e.ctrlKey) : true;
      const shiftOk = wantsShift ? e.shiftKey : !e.shiftKey;
      const altOk = wantsAlt ? e.altKey : !e.altKey;
      if (!modOk || !shiftOk || !altOk) return;
      if (e.key.toLowerCase() !== key) return;
      if (preventDefault) e.preventDefault();
      handler(e);
    };

    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [combo, handler, enabled, preventDefault]);
}
