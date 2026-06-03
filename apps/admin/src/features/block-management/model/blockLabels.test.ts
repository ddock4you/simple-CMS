import { describe, expect, it } from 'vitest';

import { normalizeIframeEmbedUrl } from './blockLabels';

describe('normalizeIframeEmbedUrl', () => {
  it('returns null for empty string', () => {
    expect(normalizeIframeEmbedUrl('')).toBeNull();
  });

  it('returns null for whitespace-only string', () => {
    expect(normalizeIframeEmbedUrl('   ')).toBeNull();
  });

  it('returns null for an invalid URL', () => {
    expect(normalizeIframeEmbedUrl('not-a-url')).toBeNull();
  });

  it('returns null for non-YouTube/Vimeo URLs', () => {
    expect(normalizeIframeEmbedUrl('https://example.com/video/123')).toBeNull();
  });

  describe('YouTube watch URLs', () => {
    it('converts www.youtube.com/watch?v=ID to embed URL', () => {
      expect(
        normalizeIframeEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
      ).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
    });

    it('converts youtube.com/watch?v=ID (without www)', () => {
      expect(
        normalizeIframeEmbedUrl('https://youtube.com/watch?v=dQw4w9WgXcQ'),
      ).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
    });

    it('converts m.youtube.com/watch?v=ID', () => {
      expect(
        normalizeIframeEmbedUrl('https://m.youtube.com/watch?v=dQw4w9WgXcQ'),
      ).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
    });

    it('preserves start time from t= parameter (strips non-numeric suffix)', () => {
      expect(
        normalizeIframeEmbedUrl(
          'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s',
        ),
      ).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ?start=42');
    });

    it('preserves start time from start= parameter', () => {
      expect(
        normalizeIframeEmbedUrl(
          'https://www.youtube.com/watch?v=dQw4w9WgXcQ&start=30',
        ),
      ).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ?start=30');
    });

    it('returns null when v= parameter is missing', () => {
      expect(
        normalizeIframeEmbedUrl('https://www.youtube.com/watch'),
      ).toBeNull();
    });
  });

  describe('YouTube short URLs (youtu.be)', () => {
    it('converts youtu.be/ID to embed URL', () => {
      expect(normalizeIframeEmbedUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(
        'https://www.youtube.com/embed/dQw4w9WgXcQ',
      );
    });

    it('preserves start time from t= parameter', () => {
      expect(
        normalizeIframeEmbedUrl('https://youtu.be/dQw4w9WgXcQ?t=15'),
      ).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ?start=15');
    });
  });

  describe('YouTube Shorts', () => {
    it('converts www.youtube.com/shorts/ID to embed URL', () => {
      expect(
        normalizeIframeEmbedUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ'),
      ).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
    });

    it('converts youtube.com/shorts/ID (without www)', () => {
      expect(
        normalizeIframeEmbedUrl('https://youtube.com/shorts/dQw4w9WgXcQ'),
      ).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
    });
  });

  describe('already-embed URLs pass through unchanged', () => {
    it('returns YouTube embed URL as-is', () => {
      const embed = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
      expect(normalizeIframeEmbedUrl(embed)).toBe(embed);
    });

    it('returns youtube-nocookie.com embed URL as-is', () => {
      const embed = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ';
      expect(normalizeIframeEmbedUrl(embed)).toBe(embed);
    });

    it('returns Vimeo player embed URL as-is', () => {
      const embed = 'https://player.vimeo.com/video/123456789';
      expect(normalizeIframeEmbedUrl(embed)).toBe(embed);
    });
  });

  describe('Vimeo URLs', () => {
    it('converts vimeo.com/numericId to player embed URL', () => {
      expect(normalizeIframeEmbedUrl('https://vimeo.com/123456789')).toBe(
        'https://player.vimeo.com/video/123456789',
      );
    });

    it('converts www.vimeo.com/numericId', () => {
      expect(normalizeIframeEmbedUrl('https://www.vimeo.com/123456789')).toBe(
        'https://player.vimeo.com/video/123456789',
      );
    });

    it('returns null for non-numeric Vimeo paths (channels/usernames)', () => {
      expect(
        normalizeIframeEmbedUrl('https://vimeo.com/channels/staffpicks'),
      ).toBeNull();
    });

    it('returns null for Vimeo user profile paths', () => {
      expect(normalizeIframeEmbedUrl('https://vimeo.com/username')).toBeNull();
    });
  });

  describe('Google Maps embed URLs', () => {
    const mapsSrc =
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3165';

    it('returns Google Maps embed URL as-is', () => {
      expect(normalizeIframeEmbedUrl(mapsSrc)).toBe(mapsSrc);
    });

    it('extracts src from a full iframe embed code', () => {
      expect(
        normalizeIframeEmbedUrl(
          `<iframe src="${mapsSrc}" width="600" height="450" style="border:0;" loading="lazy"></iframe>`,
        ),
      ).toBe(mapsSrc);
    });

    it('returns null for non-map Google URLs', () => {
      expect(normalizeIframeEmbedUrl('https://www.google.com/search?q=map')).toBeNull();
    });
  });

  describe('returns null for unembeddable YouTube URLs', () => {
    it('returns null for YouTube playlist URL', () => {
      expect(
        normalizeIframeEmbedUrl(
          'https://www.youtube.com/playlist?list=PLxyz',
        ),
      ).toBeNull();
    });

    it('returns null for YouTube channel URL', () => {
      expect(
        normalizeIframeEmbedUrl('https://www.youtube.com/channel/UCxyz'),
      ).toBeNull();
    });

    it('returns null for YouTube user URL', () => {
      expect(
        normalizeIframeEmbedUrl('https://www.youtube.com/user/username'),
      ).toBeNull();
    });
  });
});
