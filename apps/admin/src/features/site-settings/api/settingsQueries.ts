import { queryOptions } from '@tanstack/react-query';

import { settingsKeys } from '@/shared/api/queryKeys';
import {
  getBrandingSettings,
  getDomainSettings,
  getSecuritySettings,
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
