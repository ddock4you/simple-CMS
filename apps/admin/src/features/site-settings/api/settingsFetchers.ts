import { fetchClient } from '@/shared/api/fetchClient';
import type {
  DomainSettingsData,
  SecuritySettingsData,
  UploadSettingsData,
  DnsCheckResult,
  UpdateDomainData,
  UpdateSecurityData,
  UpdateUploadData,
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
