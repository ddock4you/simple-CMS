import { DEFAULT_SITE_FOOTER_IDENTIFIER_TEXT } from '@simple-cms/types';

import type { FilteredMenuItem } from '@/entities/navigation/lib/filterMenuItems';
import { getMenuItemHref } from '@/entities/navigation/lib/getMenuItemHref';
import { isExternalMenuItem } from '@/entities/navigation/lib/isExternalMenuItem';
import { ExternalMenuIcon } from '@/entities/navigation/ui/ExternalMenuIcon';
import type { Branding } from '@/shared/lib/brandingCache';
import type { ResolvedSiteFooterConfig } from '@/shared/lib/footerConfigCache';

interface FooterChromeProps {
  branding: Branding;
  footerMenuItems: FilteredMenuItem[];
  footerConfig: ResolvedSiteFooterConfig;
}

function getLinkTarget(openInNewTab?: boolean): '_blank' | '_self' {
  return openInNewTab ? '_blank' : '_self';
}

function getLinkRel(openInNewTab?: boolean): string | undefined {
  return openInNewTab ? 'noopener noreferrer' : undefined;
}

function getSocialIconClass(platform: string): string {
  switch (platform.toLowerCase()) {
    case 'instagram':
      return 'ico-instagram';
    case 'youtube':
      return 'ico-youtube';
    case 'x':
    case 'twitter':
      return 'ico-sns-x';
    case 'facebook':
      return 'ico-facebook';
    case 'blog':
      return 'ico-blog';
    default:
      return '';
  }
}

export function FooterChrome({
  branding,
  footerMenuItems,
  footerConfig,
}: FooterChromeProps) {
  const quickLinks = footerConfig.hideQuickLinks
    ? []
    : footerConfig.quickLinks;
  const bottomLinks = footerConfig.bottomLinks;

  return (
    <footer id="krds-footer">
      {quickLinks.length > 0 && (
        <div className="foot-quick">
          <div className="inner">
            {quickLinks.map((item) => (
              <a
                key={`${item.title}-${item.url}`}
                href={item.url}
                className="link"
                target={getLinkTarget(item.openInNewTab)}
                rel={getLinkRel(item.openInNewTab)}
              >
                {item.title}
              </a>
            ))}
          </div>
        </div>
      )}
      <div className="inner">
        <div
          className={
            footerConfig.footerLogoUrl ? 'f-logo has-custom-logo' : 'f-logo'
          }
        >
          {footerConfig.footerLogoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={footerConfig.footerLogoUrl}
              alt={footerConfig.footerLogoAlt ?? branding.siteName}
            />
          ) : (
            <span className="sr-only">{branding.siteName}</span>
          )}
        </div>
        <div className="f-cnt">
          <div className="f-info">
            {footerConfig.address && (
              <p className="info-addr">{footerConfig.address}</p>
            )}
            {footerConfig.contacts.length > 0 && (
              <ul className="info-cs">
                {footerConfig.contacts.map((contact) => (
                  <li key={`${contact.title}-${contact.description}`}>
                    <strong className="strong">{contact.title}</strong>
                    <span className="span">{contact.description}</span>
                  </li>
                ))}
              </ul>
            )}
            {footerMenuItems.length > 0 && (
              <div className="f-menu">
                {footerMenuItems.map((item) => {
                  const href = getMenuItemHref(item);
                  const external = isExternalMenuItem(item, href);
                  return (
                    <a
                      key={item.id}
                      href={href}
                      target={getLinkTarget(item.openInNewTab)}
                      rel={getLinkRel(item.openInNewTab)}
                    >
                      {item.label}
                      {external && <ExternalMenuIcon />}
                    </a>
                  );
                })}
              </div>
            )}
          </div>
          {footerConfig.socialLinks.length > 0 && (
            <div className="f-link">
              <div className="link-sns">
                {footerConfig.socialLinks.map((item) => (
                  <a
                    key={`${item.platform}-${item.href}`}
                    href={item.href}
                    target={getLinkTarget(item.openInNewTab)}
                    rel={getLinkRel(item.openInNewTab)}
                    className="krds-btn xlarge icon border"
                    title="새 창 열기"
                  >
                    <span className="sr-only">{item.platform}</span>
                    <i
                      className={`svg-icon ${getSocialIconClass(item.platform)}`}
                      aria-hidden="true"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="f-btm">
          <div className="f-btm-text">
            {bottomLinks.length > 0 && (
              <div className="f-menu">
                {bottomLinks.map((item) => (
                  <a
                    key={`${item.text}-${item.href}`}
                    href={item.href}
                    target={getLinkTarget(item.openInNewTab)}
                    rel={getLinkRel(item.openInNewTab)}
                    className={item.isHighlighted ? 'point' : undefined}
                  >
                    {item.text}
                  </a>
                ))}
              </div>
            )}
            <p className="f-copy">
              {footerConfig.copyright ??
                `© ${branding.siteName}. All rights reserved.`}
            </p>
          </div>
          {!footerConfig.hideIdentifier && (
            <div aria-label="운영기관 식별자" className="krds-identifier">
              <span className="logo">
                <span className="sr-only">{branding.siteName}</span>
              </span>
              <span className="ban-txt">
                {footerConfig.identifierText ??
                  DEFAULT_SITE_FOOTER_IDENTIFIER_TEXT}
              </span>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
