import { getSiteSetting } from '@simple-cms/db';
import { SITE_SETTING_KEYS } from '@simple-cms/types';

import { createSettingsCache } from './createSettingsCache';

const domainCache = createSettingsCache({
  fetcher: async (): Promise<string | null> => {
    const domain = await getSiteSetting(SITE_SETTING_KEYS.SITE_DOMAIN);
    return domain || null;
  },
});

export const getCachedDomain = () => domainCache.get();

export const invalidateDomainCache = () => domainCache.invalidate();
