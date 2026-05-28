import { queryOptions } from '@tanstack/react-query';

import { settingsKeys } from '@/shared/api/queryKeys';
import {
  getBrandingSettings,
  getDomainSettings,
  getFooterSettings,
  getSecuritySettings,
  getSeoSettings,
  getUploadSettings,
} from './settingsFetchers';

export const domainSettingsOptions = () =>
  queryOptions({
    queryKey: settingsKeys.domain(),
    queryFn: () => getDomainSettings(),
  });

export const securitySettingsOptions = () =>
  queryOptions({
    queryKey: settingsKeys.security(),
    queryFn: () => getSecuritySettings(),
  });

export const uploadSettingsOptions = () =>
  queryOptions({
    queryKey: settingsKeys.upload(),
    queryFn: () => getUploadSettings(),
  });

export const brandingSettingsOptions = () =>
  queryOptions({
    queryKey: settingsKeys.branding(),
    queryFn: () => getBrandingSettings(),
  });

export const footerSettingsOptions = () =>
  queryOptions({
    queryKey: settingsKeys.footer(),
    queryFn: () => getFooterSettings(),
  });

export const seoSettingsOptions = () =>
  queryOptions({
    queryKey: settingsKeys.seo(),
    queryFn: () => getSeoSettings(),
  });
