import { FEEDBACK_RATE_LIMIT_HOURS } from '@simple-cms/types';

const KEY_PREFIX = 'feedback_submitted_';
const TTL_MS = FEEDBACK_RATE_LIMIT_HOURS * 60 * 60 * 1000;

interface StoredEntry {
  submittedAt: number;
}

function storageKey(subpageId: string): string {
  return `${KEY_PREFIX}${subpageId}`;
}

export function hasSubmitted(subpageId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = window.localStorage.getItem(storageKey(subpageId));
    if (!raw) return false;
    const parsed = JSON.parse(raw) as StoredEntry;
    if (
      typeof parsed?.submittedAt !== 'number' ||
      Date.now() - parsed.submittedAt > TTL_MS
    ) {
      window.localStorage.removeItem(storageKey(subpageId));
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function markSubmitted(subpageId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: StoredEntry = { submittedAt: Date.now() };
    window.localStorage.setItem(storageKey(subpageId), JSON.stringify(entry));
  } catch {
    // 무시 — 공간 부족/private mode 등
  }
}
