'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import type { FilteredMenuItem } from '@/entities/navigation/lib/filterMenuItems';
import { getMenuItemHref } from '@/entities/navigation/lib/getMenuItemHref';

interface RightSidebarProps {
  menuName: string;
  items: FilteredMenuItem[];
}

interface FlatNavItem {
  href: string;
  label: string;
  external: boolean;
  openInNewTab: boolean;
  active: boolean;
}

function flattenLeaves(
  items: FilteredMenuItem[],
  pathname: string,
  out: FlatNavItem[],
) {
  for (const item of items) {
    if (item.children.length > 0) {
      flattenLeaves(item.children, pathname, out);
      continue;
    }
    const href = getMenuItemHref(item);
    const external =
      item.itemType === 'EXTERNAL' || /^https?:\/\//i.test(href);
    out.push({
      href,
      label: item.label,
      external,
      openInNewTab: item.openInNewTab,
      active: href === pathname,
    });
  }
}

/**
 * SIDEBAR 슬롯 메뉴를 "우측 사이드바"로 표시한다.
 *
 * KRDS `InPageNavigation`은 items의 href를 `document.querySelector(href)`로 소비해
 * "같은 페이지 내 앵커 스크롤"용으로 설계되어 있다. 외부 링크/페이지 경로를 href로
 * 넘기면 SyntaxError가 발생하므로 컴포넌트 자체는 사용하지 않고, KRDS의 동일 DOM 구조
 * (`krds-in-page-navigation-type`/`-area`/`in-page-navigation-header`/`-list`)와 CSS
 * 클래스를 차용한 커스텀 JSX로 렌더하여 시각적 동등성을 유지한다.
 */
export function RightSidebar({ menuName, items }: RightSidebarProps) {
  const pathname = usePathname() ?? '';
  const flat: FlatNavItem[] = [];
  flattenLeaves(items, pathname, flat);

  if (flat.length === 0) return null;

  const title = menuName || '';
  const caption = `${menuName || '빠른 이동'} 네비게이션`;

  return (
    <aside className="right-sidebar" aria-label={caption}>
      <div className="krds-in-page-navigation-type">
        <div className="krds-in-page-navigation-area">
          <div className="in-page-navigation-header">
            <p className="quick-caption">{caption}</p>
            {title && <p className="quick-title">{title}</p>}
          </div>
          <nav className="in-page-navigation-list" aria-label={caption}>
            <ul>
              {flat.map((item, idx) => {
                const className = item.active ? 'active' : undefined;
                const target = item.openInNewTab ? '_blank' : undefined;
                const rel = item.openInNewTab
                  ? 'noopener noreferrer'
                  : undefined;

                return (
                  <li key={`${item.href}-${idx}`}>
                    {item.external ? (
                      <a
                        href={item.href}
                        className={className}
                        target={target}
                        rel={rel}
                      >
                        {item.label}
                      </a>
                    ) : (
                      <Link
                        href={item.href}
                        className={className}
                        target={target}
                        rel={rel}
                        aria-current={item.active ? 'page' : undefined}
                      >
                        {item.label}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>
    </aside>
  );
}
