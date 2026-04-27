import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { hasSubmitted, markSubmitted } from './feedbackStorage';

describe('feedbackStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-26T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns false when nothing stored', () => {
    expect(hasSubmitted('subpage-1')).toBe(false);
  });

  it('returns true after markSubmitted within 24h', () => {
    markSubmitted('subpage-1');
    expect(hasSubmitted('subpage-1')).toBe(true);
  });

  it('expires after 24 hours and clears storage', () => {
    markSubmitted('subpage-1');
    expect(hasSubmitted('subpage-1')).toBe(true);

    vi.setSystemTime(new Date('2026-04-27T00:00:01.000Z'));
    expect(hasSubmitted('subpage-1')).toBe(false);
    expect(window.localStorage.getItem('feedback_submitted_subpage-1')).toBeNull();
  });

  it('isolates storage per subpage', () => {
    markSubmitted('subpage-1');
    expect(hasSubmitted('subpage-2')).toBe(false);
    expect(hasSubmitted('subpage-1')).toBe(true);
  });

  it('returns false on malformed JSON and falls through silently', () => {
    window.localStorage.setItem('feedback_submitted_subpage-1', 'not-json');
    expect(hasSubmitted('subpage-1')).toBe(false);
  });
});
