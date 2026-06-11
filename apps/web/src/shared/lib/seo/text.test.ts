import { describe, expect, it } from 'vitest';

import { summarizeContent } from './text';

describe('summarizeContent', () => {
  it('returns undefined for empty content', () => {
    expect(summarizeContent(null)).toBeUndefined();
    expect(summarizeContent('   \n\t   ')).toBeUndefined();
  });

  it('normalizes whitespace', () => {
    expect(summarizeContent('hello\n\nworld\tcms')).toBe('hello world cms');
  });

  it('truncates content with an ellipsis', () => {
    expect(summarizeContent('abcdef', 3)).toBe('abc…');
  });
});
