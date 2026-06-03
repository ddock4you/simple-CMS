'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';

import type { FilteredMenuItem } from '@/entities/navigation/lib/filterMenuItems';
import { getMenuItemHref } from '@/entities/navigation/lib/getMenuItemHref';
import { isExternalMenuItem } from '@/entities/navigation/lib/isExternalMenuItem';
import { ExternalMenuIcon } from '@/entities/navigation/ui/ExternalMenuIcon';

interface MobileMenuIslandProps {
  items: FilteredMenuItem[];
  utilityLinks: readonly { id: string; label: string; href: string }[];
  searchHref: string;
}

function flattenMenuItems(items: FilteredMenuItem[]): FilteredMenuItem[] {
  return items.flatMap((item) => {
    if (item.children.length === 0) return [item];
    return [item, ...flattenMenuItems(item.children)];
  });
}

export function MobileMenuIsland({
  items,
  utilityLinks,
  searchHref,
}: MobileMenuIslandProps) {
  const navId = useId();
  const [open, setOpen] = useState(false);
  const flatItems = useMemo(() => flattenMenuItems(items), [items]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.body.classList.add('is-gnb-mobile');
    document.body.classList.add('scroll-no');
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.classList.remove('is-gnb-mobile');
      document.body.classList.remove('scroll-no');
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="btn-navi all navi-row"
        aria-controls={navId}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        전체메뉴
      </button>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            id={navId}
            className="krds-main-menu-mobile is-backdrop is-open block"
            role="dialog"
            aria-modal="true"
            aria-label="전체메뉴"
            onClick={(event) => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
          >
            <div className="gnb-wrap">
              <div className="gnb-header">
                {utilityLinks.length > 0 && (
                  <div className="gnb-utils">
                    <ul className="utility-list">
                      {utilityLinks.map((item) => (
                        <li key={item.id}>
                          <a href={item.href} className="krds-btn xsmall text">
                            {item.label}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="gnb-service-menu">
                  <a href={searchHref} className="link">
                    통합검색
                  </a>
                </div>
              </div>
              <div className="gnb-body">
                <div className="gnb-menu">
                  <div className="submenu-wrap block w-full">
                    {items.map((item) => (
                      <section className="gnb-sub-list active" key={item.id}>
                        <h2 className="sub-title">{item.label}</h2>
                        <ul>
                          {(item.children.length > 0
                            ? item.children
                            : [item]
                          ).map((child) => {
                            const href = getMenuItemHref(child);
                            const external = isExternalMenuItem(child, href);
                            return (
                              <li key={child.id}>
                                <a
                                  href={href}
                                  className="gnb-sub-trigger"
                                  target={
                                    child.openInNewTab ? '_blank' : undefined
                                  }
                                  rel={
                                    child.openInNewTab
                                      ? 'noopener noreferrer'
                                      : undefined
                                  }
                                  onClick={() => setOpen(false)}
                                >
                                  {child.label}
                                  {external && <ExternalMenuIcon />}
                                </a>
                                {child.children.length > 0 && (
                                  <div className="depth3-wrap is-open">
                                    <ul>
                                      {child.children.map((grandchild) => {
                                        const grandchildHref =
                                          getMenuItemHref(grandchild);
                                        const grandchildExternal =
                                          isExternalMenuItem(
                                            grandchild,
                                            grandchildHref,
                                          );
                                        return (
                                          <li key={grandchild.id}>
                                            <a
                                              href={grandchildHref}
                                              className="depth3-trigger"
                                              target={
                                                grandchild.openInNewTab
                                                  ? '_blank'
                                                  : undefined
                                              }
                                              rel={
                                                grandchild.openInNewTab
                                                  ? 'noopener noreferrer'
                                                  : undefined
                                              }
                                              onClick={() => setOpen(false)}
                                            >
                                              {grandchild.label}
                                              {grandchildExternal && (
                                                <ExternalMenuIcon />
                                              )}
                                            </a>
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                    ))}
                    {items.length === 0 && (
                      <section className="gnb-sub-list active">
                        <h2 className="sub-title">메뉴</h2>
                        <ul>
                          <li>
                            <Link href="/" className="gnb-sub-trigger">
                              홈
                            </Link>
                          </li>
                        </ul>
                      </section>
                    )}
                    {flatItems.length > 0 && (
                      <nav className="sr-only" aria-label="전체 메뉴 빠른 목록">
                        {flatItems.map((item) => (
                          <a key={item.id} href={getMenuItemHref(item)}>
                            {item.label}
                          </a>
                        ))}
                      </nav>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="krds-btn medium icon"
                id="close-nav"
                onClick={() => setOpen(false)}
              >
                <span className="sr-only">전체메뉴 닫기</span>
                <i className="svg-icon ico-popup-close" aria-hidden="true" />
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
