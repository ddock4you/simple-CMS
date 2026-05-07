'use client';

import { useSyncExternalStore } from 'react';
import { Search } from 'lucide-react';

import { Button } from '@/shared/ui/Button';

const noopSubscribe = () => () => {};
const getIsMacSnapshot = () =>
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad|iPod/.test(navigator.platform);
const getServerSnapshot = () => false;

/**
 * AdminHeader에 노출되는 [검색 ⌘K] 보조 버튼.
 * 키보드 단축키를 발사해서 layout에 마운트된 CommandPalette를 연다.
 *
 * CommandPalette와 직접 통신하지 않고 단축키 dispatch로 결합도 최소화.
 */
export function CommandPaletteTrigger() {
  const isMac = useSyncExternalStore(
    noopSubscribe,
    getIsMacSnapshot,
    getServerSnapshot,
  );

  const handleClick = () => {
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      code: 'KeyK',
      metaKey: isMac,
      ctrlKey: !isMac,
      bubbles: true,
    });
    window.dispatchEvent(event);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      className="gap-2"
    >
      <Search className="size-4" />
      <span className="hidden md:inline">검색</span>
      <kbd className="hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
        {isMac ? '⌘K' : 'Ctrl+K'}
      </kbd>
    </Button>
  );
}
