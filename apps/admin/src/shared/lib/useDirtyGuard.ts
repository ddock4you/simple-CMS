'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const DEMO_ADMIN_BASE_PATH = '/_cms/admin';

function stripAdminBasePath(pathname: string): string {
  if (pathname === DEMO_ADMIN_BASE_PATH) return '/';
  if (pathname.startsWith(`${DEMO_ADMIN_BASE_PATH}/`)) {
    return pathname.slice(DEMO_ADMIN_BASE_PATH.length) || '/';
  }
  return pathname;
}

export interface UseDirtyGuardResult {
  confirmDialogProps: {
    open: boolean;
    onConfirm: () => void;
    onCancel: () => void;
  };
  /**
   * 명시적으로 가드를 우회하여 곧바로 navigate해야 할 때 호출.
   * mutation 성공 후 router.push 직전 등에서 사용.
   */
  bypass: () => void;
}

/**
 * 페이지 폼용 Dirty 가드.
 *
 * 가로채는 케이스:
 * - `beforeunload`: 탭 닫기/새로고침/외부 이동 (네이티브 브라우저 경고)
 * - document click capture: `<a href>` 좌클릭 (사이드바, [목록으로] 링크 등)
 *
 * 가로채지 못하는 케이스:
 * - `useRouter().push()` 직접 호출 — App Router는 가로채기 API를 제공하지 않음.
 *   호출처가 mutation 성공 후라면 이미 isDirty=false이므로 정상 동작.
 *   필요 시 호출 직전에 `bypass()` 호출.
 * - 브라우저 뒤로/앞으로 — popstate 가로채기는 history 조작이 까다로워 1차에서 제외.
 *   beforeunload가 일부 케이스를 보완.
 */
export function useDirtyGuard(isDirty: boolean): UseDirtyGuardResult {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const pendingNavRef = useRef<(() => void) | null>(null);
  const bypassedRef = useRef(false);

  useEffect(() => {
    if (!isDirty) {
      bypassedRef.current = false;
    }
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return;

    const handler = (e: BeforeUnloadEvent) => {
      if (bypassedRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return;

    const handler = (e: MouseEvent) => {
      if (bypassedRef.current) return;
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const target = e.target as Element | null;
      if (!target) return;
      const anchor = target.closest('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;

      if (anchor.target === '_blank') return;
      if (anchor.hasAttribute('download')) return;

      const href = anchor.getAttribute('href');
      if (!href) return;
      if (
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('javascript:')
      ) {
        return;
      }

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.origin);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }

      e.preventDefault();
      const nextPath = stripAdminBasePath(url.pathname) + url.search + url.hash;
      pendingNavRef.current = () => {
        router.push(nextPath);
      };
      setOpen(true);
    };

    document.addEventListener('click', handler, { capture: true });
    return () =>
      document.removeEventListener('click', handler, { capture: true });
  }, [isDirty, router]);

  const handleConfirm = useCallback(() => {
    bypassedRef.current = true;
    setOpen(false);
    const nav = pendingNavRef.current;
    pendingNavRef.current = null;
    if (nav) nav();
  }, []);

  const handleCancel = useCallback(() => {
    setOpen(false);
    pendingNavRef.current = null;
  }, []);

  const bypass = useCallback(() => {
    bypassedRef.current = true;
  }, []);

  return {
    confirmDialogProps: {
      open,
      onConfirm: handleConfirm,
      onCancel: handleCancel,
    },
    bypass,
  };
}
