import { fetchClient } from '@/shared/api/fetchClient';
import type {
  BrandingAssetKind,
  BrandingSettingsData,
  DnsCheckResult,
  DomainSettingsData,
  SecuritySettingsData,
  UpdateBrandingData,
  UpdateDomainData,
  UpdateSecurityData,
  UpdateUploadData,
  UploadSettingsData,
} from '../model/settingsSchemas';

// Domain
export function getDomainSettings(): Promise<DomainSettingsData> {
  return fetchClient<DomainSettingsData>('/api/settings/domain');
}

export function updateDomainSettings(data: UpdateDomainData): Promise<null> {
  return fetchClient<null>('/api/settings/domain', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteDomainSettings(): Promise<null> {
  return fetchClient<null>('/api/settings/domain', { method: 'DELETE' });
}

export function checkDns(): Promise<DnsCheckResult> {
  return fetchClient<DnsCheckResult>('/api/settings/domain/check-dns', {
    method: 'POST',
  });
}

// Security
export function getSecuritySettings(): Promise<SecuritySettingsData> {
  return fetchClient<SecuritySettingsData>('/api/settings/security');
}

export function updateSecuritySettings(data: UpdateSecurityData): Promise<null> {
  return fetchClient<null>('/api/settings/security', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// Upload
export function getUploadSettings(): Promise<UploadSettingsData> {
  return fetchClient<UploadSettingsData>('/api/settings/upload');
}

export function updateUploadSettings(data: UpdateUploadData): Promise<null> {
  return fetchClient<null>('/api/settings/upload', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// Branding (Stage 7l)
export function getBrandingSettings(): Promise<BrandingSettingsData> {
  return fetchClient<BrandingSettingsData>('/api/settings/branding');
}

export function updateBrandingSettings(
  data: UpdateBrandingData,
): Promise<null> {
  return fetchClient<null>('/api/settings/branding', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteBrandingAsset(kind: BrandingAssetKind): Promise<null> {
  return fetchClient<null>(`/api/settings/branding?kind=${kind}`, {
    method: 'DELETE',
  });
}
