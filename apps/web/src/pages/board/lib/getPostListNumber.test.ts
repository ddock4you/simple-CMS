import { describe, expect, it } from 'vitest';

import { getPostListNumber } from './getPostListNumber';

describe('getPostListNumber', () => {
  it('starts ordinary numbering after important posts on the first page', () => {
    expect(
      getPostListNumber({
        itemIndex: 2,
        page: 1,
        pageSize: 20,
        total: 12,
        regularTotal: 10,
      }),
    ).toBe(10);
  });

  it('keeps descending ordinary numbers across pages', () => {
    expect(
      getPostListNumber({
        itemIndex: 0,
        page: 2,
        pageSize: 5,
        total: 12,
        regularTotal: 10,
      }),
    ).toBe(7);
  });
});
