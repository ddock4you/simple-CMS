import { describe, expect, it } from 'vitest';

import { generateSlug } from './generateSlug';

describe('generateSlug', () => {
  it('영문 소문자 변환', () => {
    expect(generateSlug('Hello World')).toBe('hello-world');
  });

  it('공백을 하이픈으로 변환', () => {
    expect(generateSlug('foo bar baz')).toBe('foo-bar-baz');
  });

  it('숫자 유지', () => {
    expect(generateSlug('Stage 12 Test')).toBe('stage-12-test');
  });

  it('앞뒤 공백 제거', () => {
    expect(generateSlug('  hello  ')).toBe('hello');
  });

  it('연속 하이픈 축약', () => {
    expect(generateSlug('hello---world')).toBe('hello-world');
  });

  it('앞뒤 하이픈 제거', () => {
    expect(generateSlug('-hello-')).toBe('hello');
  });

  it('특수문자 제거', () => {
    expect(generateSlug('hello!@#$%world')).toBe('helloworld');
  });

  it('한국어만 → 빈 문자열 (NFKD 분해 후 비ASCII 제거)', () => {
    expect(generateSlug('안녕하세요')).toBe('');
  });

  it('영문+한국어 혼합 → 영문 부분만', () => {
    expect(generateSlug('hello 세계')).toBe('hello');
  });

  it('빈 문자열 → 빈 문자열', () => {
    expect(generateSlug('')).toBe('');
  });

  it('밑줄 제거 (비ASCII 아님 → 문자·숫자·공백·하이픈만 허용)', () => {
    expect(generateSlug('hello_world')).toBe('helloworld');
  });

  it('영숫자+하이픈만 있는 슬러그는 그대로', () => {
    expect(generateSlug('my-post-123')).toBe('my-post-123');
  });
});
