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
    const backdrop = document.querySelector<HTMLElement>('.gnb-backdrop');
    let activeDropdown: HTMLElement | null = null;
    let lastTrigger: HTMLElement | null = null;

    const setActiveDropdown = (dropdown: HTMLElement | null, options?: { restoreFocus?: boolean }) => {
      if (activeDropdown === dropdown) return;

      if (activeDropdown) {
        activeDropdown.removeAttribute('data-active');
        activeDropdown.classList.remove('active');
        activeDropdown
          .querySelector<HTMLElement>('.gnb-main-trigger')
          ?.setAttribute('aria-expanded', 'false');
        activeDropdown
          .querySelector<HTMLElement>('.gnb-toggle-wrap')
          ?.classList.remove('is-open');
      }

      activeDropdown = dropdown;
      backdrop?.classList.toggle('active', Boolean(activeDropdown));

      if (activeDropdown) {
        activeDropdown.setAttribute('data-active', 'true');
        activeDropdown.classList.add('active');
        const trigger = activeDropdown.querySelector<HTMLElement>('.gnb-main-trigger');
        trigger?.setAttribute('aria-expanded', 'true');
        activeDropdown
          .querySelector<HTMLElement>('.gnb-toggle-wrap')
          ?.classList.add('is-open');
        lastTrigger = trigger;
      } else if (options?.restoreFocus) {
        lastTrigger?.focus();
      }
    };

    const onDocumentClick = (event: MouseEvent) => {
      if (!activeDropdown) return;
      const target = event.target;
      if (target instanceof Node && !nav.contains(target)) {
        setActiveDropdown(null);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && activeDropdown) {
        event.preventDefault();
        setActiveDropdown(null, { restoreFocus: true });
      }
    };
    const onBackdropClick = () => setActiveDropdown(null);

    const removers = dropdowns.map((dropdown) => {
      const trigger = dropdown.querySelector<HTMLElement>('.gnb-main-trigger');
      const onClick = (event: MouseEvent) => {
        event.preventDefault();
        setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
      };

      trigger?.addEventListener('click', onClick);

      return () => {
        trigger?.removeEventListener('click', onClick);
      };
    });

    nav.addEventListener('keydown', onKeyDown);
    backdrop?.addEventListener('click', onBackdropClick);
    document.addEventListener('click', onDocumentClick);

    return () => {
      setActiveDropdown(null);
      removers.forEach((remove) => remove());
      nav.removeEventListener('keydown', onKeyDown);
      backdrop?.removeEventListener('click', onBackdropClick);
      document.removeEventListener('click', onDocumentClick);
    };
  }, [navId]);

  return <span hidden data-desktop-gnb-behavior />;
}
