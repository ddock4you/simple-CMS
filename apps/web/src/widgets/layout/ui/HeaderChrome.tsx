import type { FilteredMenuItem } from '@/entities/navigation/lib/filterMenuItems';
import { getMenuItemHref } from '@/entities/navigation/lib/getMenuItemHref';
import { isExternalMenuItem } from '@/entities/navigation/lib/isExternalMenuItem';
import { ExternalMenuIcon } from '@/entities/navigation/ui/ExternalMenuIcon';
import type { Branding } from '@/shared/lib/brandingCache';

import { DesktopGnbBehavior } from './DesktopGnbBehavior';
import { HeaderBranding } from './HeaderBranding';

const KRDS_HOME_URL = 'https://www.krds.go.kr/';
const DESKTOP_GNB_ID = 'web-desktop-gnb';

const HEADER_UTILITY_LINKS = [
  {
    id: 'krds-intro',
    label: 'KRDS 소개',
    href: KRDS_HOME_URL,
  },
] as const;

const desktopDropdownClassName = [
  'web-gnb-dropdown',
  "[&[data-active='true']>.gnb-toggle-wrap]:!block",
  "[&[data-active='true']>.gnb-main-trigger::before]:!left-0",
  "[&[data-active='true']>.gnb-main-trigger::before]:!w-full",
  "[&[data-active='true']>.gnb-main-trigger::after]:rotate-[-180deg]",
].join(' ');

const depth3SubgroupClassName = [
  'web-gnb-subgroup',
  'large:col-span-full',
  'large:grid',
  'large:w-auto',
  'large:grid-cols-[var(--krds-main-menu--main-menu-width)_minmax(0,1fr)]',
  'large:items-stretch',
].join(' ');

const depth3PanelClassName = [
  'web-gnb-depth3-panel',
  'large:col-start-2',
  'large:flex',
  'large:min-w-0',
  'large:px-[var(--krds-main-menu--sub-menu-padding-x)]',
  'large:py-[var(--krds-main-menu--sub-menu-padding-y)]',
].join(' ');

const depth3ContentClassName = [
  'gnb-sub-content',
  'large:flex',
  'large:min-w-0',
  'large:flex-1',
  'large:flex-col',
  'large:gap-[var(--krds-gap-5)]',
].join(' ');

const depth3TitleClassName = [
  'sub-title',
  'large:flex',
  'large:min-h-[var(--krds-main-menu--sub-menu-title-size-height)]',
  'large:items-center',
  'large:px-[var(--krds-padding-2)]',
  'large:text-[length:var(--krds-main-menu--sub-menu-title-font-size)]',
  'large:font-bold',
].join(' ');

const depth3ListClassName = [
  'web-gnb-depth3-list',
  'large:grid',
  'large:grid-cols-3',
  'large:gap-[var(--krds-gap-7)]',
].join(' ');

const depth3LinkClassName = [
  'large:flex',
  'large:w-full',
  'large:items-start',
  'large:gap-[var(--krds-gap-3)]',
  'large:rounded-[var(--krds-main-menu--sub-menu-trigger-color-radius)]',
  'large:bg-[var(--krds-main-menu--sub-menu-color-action)]',
  'large:px-[var(--krds-main-menu--sub-menu-trigger-color-padding-x)]',
  'large:py-[var(--krds-main-menu--sub-menu-trigger-color-padding-y)]',
  'large:text-[length:var(--krds-main-menu--sub-menu-trigger-color-font-size)]',
  'large:before:mt-[var(--krds-padding-4)]',
  "large:before:content-['']",
  'large:before:h-[0.25rem]',
  'large:before:w-[0.25rem]',
  'large:before:flex-none',
  'large:before:rounded-[var(--krds-radius-max)]',
  'large:before:bg-[var(--krds-light-color-text-basic)]',
  'large:hover:bg-[var(--krds-main-menu--sub-menu-color-action-hover)]',
  'large:focus:bg-[var(--krds-main-menu--sub-menu-color-action-pressed)]',
  'large:focus:shadow-[var(--krds-box-shadow-outline-inset)]',
  'large:focus:outline-offset-[-0.25rem]',
  'large:active:bg-[var(--krds-main-menu--sub-menu-color-action-pressed)]',
].join(' ');

interface HeaderChromeProps {
  branding: Branding;
  headerMenuItems: FilteredMenuItem[];
}

function renderDesktopLeaf(item: FilteredMenuItem) {
  const href = getMenuItemHref(item);
  const external = isExternalMenuItem(item, href);

  return (
    <a
      href={href}
      className={`gnb-sub-trigger is-link${external ? ' external-link' : ''}`}
      target={item.openInNewTab ? '_blank' : undefined}
      rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
    >
      {item.label}
    </a>
  );
}

function DesktopSubPanel({
  item,
  hasSiblingSubmenu,
}: {
  item: FilteredMenuItem;
  hasSiblingSubmenu: boolean;
}) {
  const href = getMenuItemHref(item);
  const external = isExternalMenuItem(item, href);

  if (item.children.length === 0) {
    return (
      <li
        className={
          hasSiblingSubmenu ? 'large:col-start-1 large:w-auto' : undefined
        }
      >
        {renderDesktopLeaf(item)}
      </li>
    );
  }

  return (
    <li className={depth3SubgroupClassName}>
      <a
        href={href}
        className={`gnb-sub-trigger large:col-start-1${external ? ' external-link' : ''}`}
        target={item.openInNewTab ? '_blank' : undefined}
        rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
      >
        {item.label}
      </a>
      <div className={depth3PanelClassName}>
        <div className={depth3ContentClassName}>
          <h2 className={depth3TitleClassName}>
            <span>{item.label}</span>
          </h2>
          <ul className={depth3ListClassName}>
            {item.children.map((child) => {
              const childHref = getMenuItemHref(child);
              const childExternal = isExternalMenuItem(child, childHref);
              return (
                <li key={child.id}>
                  <a
                    href={childHref}
                    className={depth3LinkClassName}
                    target={child.openInNewTab ? '_blank' : undefined}
                    rel={child.openInNewTab ? 'noopener noreferrer' : undefined}
                    title={childExternal ? '새 창 열림' : undefined}
                  >
                    {child.label}
                    {childExternal && <ExternalMenuIcon />}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </li>
  );
}

function DesktopMainMenu({ items }: { items: FilteredMenuItem[] }) {
  if (items.length === 0) return null;

  return (
    <nav
      id={DESKTOP_GNB_ID}
      className="krds-main-menu web-gnb"
      aria-label="주 메뉴"
    >
      <div className="inner">
        <ul className="gnb-menu">
          {items.map((item) => {
            const href = getMenuItemHref(item);
            const external = isExternalMenuItem(item, href);
            const hasSubmenu = item.children.some(
              (child) => child.children.length > 0,
            );

            if (item.children.length === 0) {
              return (
                <li key={item.id}>
                  <a
                    href={href}
                    className="gnb-main-trigger is-link"
                    target={item.openInNewTab ? '_blank' : undefined}
                    rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
                    title={external ? '새 창 열림' : undefined}
                  >
                    {item.label}
                    {external && <ExternalMenuIcon />}
                  </a>
                </li>
              );
            }

            return (
              <li key={item.id} className={desktopDropdownClassName}>
                <a
                  href={href}
                  className="gnb-main-trigger"
                  aria-haspopup="true"
                  aria-expanded="false"
                  target={item.openInNewTab ? '_blank' : undefined}
                  rel={item.openInNewTab ? 'noopener noreferrer' : undefined}
                  title={external ? '새 창 열림' : undefined}
                >
                  {item.label}
                  {external && <ExternalMenuIcon />}
                </a>
                <div className="gnb-toggle-wrap">
                  <div
                    className="gnb-main-list"
                    data-has-submenu={hasSubmenu ? 'true' : 'false'}
                  >
                    <ul
                      className={
                        hasSubmenu
                          ? 'large:grid large:grid-cols-[var(--krds-main-menu--main-menu-width)_minmax(0,1fr)] large:items-stretch'
                          : undefined
                      }
                    >
                      {item.children.map((child) => (
                        <DesktopSubPanel
                          key={child.id}
                          item={child}
                          hasSiblingSubmenu={hasSubmenu}
                        />
                      ))}
                    </ul>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <DesktopGnbBehavior navId={DESKTOP_GNB_ID} />
    </nav>
  );
}

export function HeaderChrome({ branding, headerMenuItems }: HeaderChromeProps) {
  return (
    <>
      <div id="krds-skip-link">
        <a href="#main-content">본문 바로가기</a>
      </div>
      <div id="krds-masthead">
        <div className="toggle-wrap">
          <div className="toggle-head">
            <div className="inner">
              <span className="nuri-txt">
                이 누리집은 대한민국 공식 전자정부 누리집입니다.
              </span>
            </div>
          </div>
        </div>
      </div>
      <header id="krds-header">
        <div className="header-in">
          <div className="header-container web-header-container">
            <div className="inner">
              <div className="header-utility">
                <ul className="utility-list">
                  {HEADER_UTILITY_LINKS.map((item) => (
                    <li key={item.id}>
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="krds-btn small text"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <HeaderBranding
                branding={branding}
                headerMenuItems={headerMenuItems}
                utilityLinks={HEADER_UTILITY_LINKS}
              />
            </div>
          </div>
          <DesktopMainMenu items={headerMenuItems} />
        </div>
      </header>
    </>
  );
}
