import { describe, it, expect } from 'vitest';

import { parseVersionLabel, formatVersionSubject } from './parseVersionLabel';

describe('parseVersionLabel', () => {
  it('returns empty fields when label is null', () => {
    const result = parseVersionLabel(null);
    expect(result).toEqual({
      subject: '',
      body: '',
      hasBody: false,
      truncatedSubject: false,
    });
  });

  it('returns empty fields when label is empty string', () => {
    const result = parseVersionLabel('');
    expect(result.subject).toBe('');
    expect(result.hasBody).toBe(false);
  });

  it('returns empty fields when label is whitespace only', () => {
    const result = parseVersionLabel('   \n\t  ');
    expect(result.subject).toBe('');
    expect(result.body).toBe('');
  });

  it('treats single-line label as subject-only', () => {
    const result = parseVersionLabel('hero 이미지 교체');
    expect(result.subject).toBe('hero 이미지 교체');
    expect(result.body).toBe('');
    expect(result.hasBody).toBe(false);
  });

  it('splits subject and body by blank line', () => {
    const result = parseVersionLabel(
      'hero 이미지 교체\n\n- 히어로 이미지를 신버전으로 교체\n- 공지 블록 2개 추가',
    );
    expect(result.subject).toBe('hero 이미지 교체');
    expect(result.body).toBe(
      '- 히어로 이미지를 신버전으로 교체\n- 공지 블록 2개 추가',
    );
    expect(result.hasBody).toBe(true);
  });

  it('handles blank line with indentation whitespace', () => {
    const result = parseVersionLabel('subject\n   \nbody here');
    expect(result.subject).toBe('subject');
    expect(result.body).toBe('body here');
  });

  it('collapses multi-line subject into single line before blank separator', () => {
    // 드물지만 방어적: 빈 줄 이전에 여러 라인이 있으면 공백으로 join
    const result = parseVersionLabel('line1\nline2\n\nbody');
    expect(result.subject).toBe('line1 line2');
    expect(result.body).toBe('body');
  });

  it('flags truncatedSubject when subject exceeds display limit (72자)', () => {
    const long = '가'.repeat(80);
    const result = parseVersionLabel(long);
    expect(result.subject).toBe(long);
    expect(result.truncatedSubject).toBe(true);
  });

  it('does not flag truncated when subject exactly at limit', () => {
    const boundary = '가'.repeat(72);
    const result = parseVersionLabel(boundary);
    expect(result.truncatedSubject).toBe(false);
  });
});

describe('formatVersionSubject', () => {
  it('returns subject as-is when within limit', () => {
    expect(formatVersionSubject('짧은 제목')).toBe('짧은 제목');
  });

  it('truncates with ellipsis when subject exceeds limit', () => {
    const long = '가'.repeat(80);
    const result = formatVersionSubject(long);
    expect(result.length).toBe(73);
    expect(result.endsWith('…')).toBe(true);
  });
});
