'use client';

import { useEffect } from 'react';

interface DesktopGnbBehaviorProps {
  navId: string;
}

export function DesktopGnbBehavior({ navId }: DesktopGnbBehaviorProps) {
  useEffect(() => {
    const nav = document.getElementById(navId);
    if (!nav) return;

    const dropdowns = Array.from(
      nav.querySelectorAll<HTMLElement>('.web-gnb-dropdown'),
    );
    let activeDropdown: HTMLElement | null = null;

    const setActiveDropdown = (dropdown: HTMLElement | null) => {
      if (activeDropdown === dropdown) return;

      if (activeDropdown) {
        activeDropdown.removeAttribute('data-active');
        activeDropdown
          .querySelector<HTMLElement>('.gnb-main-trigger')
          ?.setAttribute('aria-expanded', 'false');
      }

      activeDropdown = dropdown;

      if (activeDropdown) {
        activeDropdown.setAttribute('data-active', 'true');
        activeDropdown
          .querySelector<HTMLElement>('.gnb-main-trigger')
          ?.setAttribute('aria-expanded', 'true');
      }
    };

    const onPointerLeave = () => setActiveDropdown(null);
    const onFocusOut = () => {
      window.requestAnimationFrame(() => {
        if (!nav.contains(document.activeElement)) setActiveDropdown(null);
      });
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveDropdown(null);
    };

    const removers = dropdowns.map((dropdown) => {
      const onPointerEnter = () => setActiveDropdown(dropdown);
      const onFocusIn = () => setActiveDropdown(dropdown);

      dropdown.addEventListener('pointerenter', onPointerEnter);
      dropdown.addEventListener('focusin', onFocusIn);

      return () => {
        dropdown.removeEventListener('pointerenter', onPointerEnter);
        dropdown.removeEventListener('focusin', onFocusIn);
      };
    });

    nav.addEventListener('pointerleave', onPointerLeave);
    nav.addEventListener('focusout', onFocusOut);
    nav.addEventListener('keydown', onKeyDown);

    return () => {
      setActiveDropdown(null);
      removers.forEach((remove) => remove());
      nav.removeEventListener('pointerleave', onPointerLeave);
      nav.removeEventListener('focusout', onFocusOut);
      nav.removeEventListener('keydown', onKeyDown);
    };
  }, [navId]);

  return <span hidden data-desktop-gnb-behavior />;
}
