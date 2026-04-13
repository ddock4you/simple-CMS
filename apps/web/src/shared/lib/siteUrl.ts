import { getCachedDomain } from './domainCache';

export async function getSiteUrl(): Promise<string> {
  const domain = await getCachedDomain();

  if (domain) {
    return `https://${domain}`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
}
