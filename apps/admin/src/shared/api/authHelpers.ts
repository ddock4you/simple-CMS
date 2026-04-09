import { fetchClient } from '@/shared/api/fetchClient';

export function logout(): Promise<null> {
  return fetchClient<null>('/api/auth/logout', { method: 'POST' });
}
