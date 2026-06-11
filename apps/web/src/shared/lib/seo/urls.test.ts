import { describe, expect, it } from 'vitest';

import { getBoardUrl, getHomeUrl, getPostUrl, getSubpageUrl } from './urls';

describe('seo urls', () => {
  const baseUrl = 'https://example.com';

  it('builds public route urls', () => {
    expect(getHomeUrl(baseUrl)).toBe(baseUrl);
    expect(getSubpageUrl(baseUrl, 'about')).toBe(
      'https://example.com/p/about',
    );
    expect(getBoardUrl(baseUrl, 'notice')).toBe(
      'https://example.com/board/notice',
    );
    expect(getPostUrl(baseUrl, 'notice', 'post-1')).toBe(
      'https://example.com/board/notice/post-1',
    );
  });
});
