import { describe, expect, it } from 'vitest';

import { IFRAME_ALLOWED_HOSTS, isIframeHostAllowed } from './block.types';

describe('isIframeHostAllowed', () => {
  it('returns false for null', () => {
    expect(isIframeHostAllowed(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isIframeHostAllowed(undefined)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isIframeHostAllowed('')).toBe(false);
  });

  it('returns false for an invalid URL (not parseable)', () => {
    expect(isIframeHostAllowed('not-a-url')).toBe(false);
  });

  it.each(
    IFRAME_ALLOWED_HOSTS.map((host) => ({
      host,
      url: `https://${host}/embed/test`,
    })),
  )('returns true for allowed host $host', ({ url }) => {
    expect(isIframeHostAllowed(url)).toBe(true);
  });

  it('returns false for an unknown host', () => {
    expect(isIframeHostAllowed('https://evil.com/embed/video')).toBe(false);
  });

  it('returns false for a subdomain of an allowed host (no wildcard matching)', () => {
    expect(isIframeHostAllowed('https://evil.youtube.com/embed/abc')).toBe(
      false,
    );
  });

  it('returns false for a host that merely contains an allowed hostname as substring', () => {
    expect(
      isIframeHostAllowed('https://notyoutube.com/embed/abc'),
    ).toBe(false);
  });

  it('is case-insensitive for the hostname', () => {
    expect(isIframeHostAllowed('https://WWW.YOUTUBE.COM/embed/abc')).toBe(
      true,
    );
  });

  it('returns true for youtube.com without www', () => {
    expect(
      isIframeHostAllowed('https://youtube.com/embed/dQw4w9WgXcQ'),
    ).toBe(true);
  });

  it('returns true for www.youtube-nocookie.com', () => {
    expect(
      isIframeHostAllowed('https://www.youtube-nocookie.com/embed/abc'),
    ).toBe(true);
  });
});
