'use client';

import Link from 'next/link';
import { useCallback, useRef, useState } from 'react';
import type { MouseEvent } from 'react';

import { SearchOverlay } from './SearchOverlay';

interface HeaderSearchTriggerProps {
  href?: string;
}

export function HeaderSearchTrigger({ href = '/search' }: HeaderSearchTriggerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLAnchorElement>(null);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setOpen(true);
  };

  const handleClose = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  return (
    <>
      <Link
        ref={triggerRef}
        href={href}
        className="btn-navi sch navi-row"
        aria-label="통합검색"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={handleClick}
      >
        통합검색
      </Link>
      <SearchOverlay open={open} onClose={handleClose} />
    </>
  );
}
