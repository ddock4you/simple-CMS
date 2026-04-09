import { fetchClient } from '@/shared/api/fetchClient';

export function login(data: {
  username: string;
  password: string;
}): Promise<{ user: unknown }> {
  return fetchClient<{ user: unknown }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function register(data: {
  username: string;
  email?: string;
  password: string;
  passwordConfirm: string;
  name: string;
}): Promise<{ message: string }> {
  return fetchClient<{ message: string }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function logout(): Promise<null> {
  return fetchClient<null>('/api/auth/logout', { method: 'POST' });
}

export function updateProfile(data: {
  name: string;
  email?: string;
}): Promise<null> {
  return fetchClient<null>('/api/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function changePassword(data: {
  currentPassword: string;
  newPassword: string;
  newPasswordConfirm: string;
}): Promise<null> {
  return fetchClient<null>('/api/profile/change-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
