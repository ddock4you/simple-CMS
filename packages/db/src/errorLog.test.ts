import { describe, it, expect } from 'vitest';

import {
  normalizeMessage,
  normalizeUrl,
  computeErrorFingerprint,
} from './errorLog';

describe('normalizeMessage', () => {
  it('UUID를 {uuid}로 치환', () => {
    const msg = 'User 550e8400-e29b-41d4-a716-446655440000 not found';
    expect(normalizeMessage(msg)).toBe('User {uuid} not found');
  });

  it('숫자를 {n}으로 치환', () => {
    const msg = 'Error code 404 at line 23';
    expect(normalizeMessage(msg)).toBe('Error code {n} at line {n}');
  });

  it('문자열 리터럴(따옴표)을 {str}로 치환', () => {
    const msg = "Invalid value 'foo' for field";
    expect(normalizeMessage(msg)).toBe('Invalid value {str} for field');
  });

  it('큰따옴표 문자열도 {str}로 치환', () => {
    const msg = 'Invalid value "bar" provided';
    expect(normalizeMessage(msg)).toBe('Invalid value {str} provided');
  });

  it('200자 초과 메시지를 200자로 절단', () => {
    const long = 'x'.repeat(300);
    expect(normalizeMessage(long)).toHaveLength(200);
  });

  it('200자 이하 메시지는 그대로 반환', () => {
    const msg = 'short error';
    expect(normalizeMessage(msg)).toBe('short error');
  });

  it('다른 UUID라도 같은 패턴 → 같은 정규화 결과 (그루핑 보장)', () => {
    const a = normalizeMessage('User 550e8400-e29b-41d4-a716-446655440000 not found');
    const b = normalizeMessage('User aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee not found');
    expect(a).toBe(b);
  });
});

describe('normalizeUrl', () => {
  it('null → 빈 문자열', () => {
    expect(normalizeUrl(null)).toBe('');
  });

  it('undefined → 빈 문자열', () => {
    expect(normalizeUrl(undefined)).toBe('');
  });

  it('UUID 경로 세그먼트를 /{uuid}로 치환', () => {
    expect(
      normalizeUrl('/api/users/550e8400-e29b-41d4-a716-446655440000/profile'),
    ).toBe('/api/users/{uuid}/profile');
  });

  it('숫자 경로 세그먼트를 /{n}으로 치환', () => {
    expect(normalizeUrl('/api/boards/123/posts/456')).toBe(
      '/api/boards/{n}/posts/{n}',
    );
  });

  it('전체 URL에서 pathname만 추출 후 정규화', () => {
    expect(normalizeUrl('https://example.com/api/users/123')).toBe(
      '/api/users/{n}',
    );
  });

  it('이미 pathname 형태이면 그대로 정규화', () => {
    expect(normalizeUrl('/api/users/123')).toBe('/api/users/{n}');
  });

  it('동적 세그먼트 없는 경로는 변경 없음', () => {
    expect(normalizeUrl('/api/auth/login')).toBe('/api/auth/login');
  });

  it('다른 숫자 ID 같은 경로 → 같은 정규화 결과 (그루핑 보장)', () => {
    const a = normalizeUrl('/api/posts/111/comments/222');
    const b = normalizeUrl('/api/posts/999/comments/888');
    expect(a).toBe(b);
  });
});

describe('computeErrorFingerprint', () => {
  it('16자리 hex 문자열 반환', () => {
    const fp = computeErrorFingerprint('SERVER_SSR', '/api/login', 'Login failed');
    expect(fp).toMatch(/^[0-9a-f]{16}$/);
  });

  it('동일 입력 → 동일 fingerprint (결정론적)', () => {
    const a = computeErrorFingerprint('CLIENT_JS', '/search', 'TypeError: foo');
    const b = computeErrorFingerprint('CLIENT_JS', '/search', 'TypeError: foo');
    expect(a).toBe(b);
  });

  it('다른 UUID 같은 메시지 패턴 → 같은 fingerprint (에러 그루핑)', () => {
    const a = computeErrorFingerprint(
      'SERVER_API',
      '/api/users/550e8400-e29b-41d4-a716-446655440000',
      'User not found',
    );
    const b = computeErrorFingerprint(
      'SERVER_API',
      '/api/users/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      'User not found',
    );
    expect(a).toBe(b);
  });

  it('다른 메시지 → 다른 fingerprint', () => {
    const a = computeErrorFingerprint('SERVER_SSR', '/p/slug', 'Error A');
    const b = computeErrorFingerprint('SERVER_SSR', '/p/slug', 'Error B');
    expect(a).not.toBe(b);
  });

  it('다른 source → 다른 fingerprint', () => {
    const a = computeErrorFingerprint('SERVER_SSR', '/login', 'Auth failed');
    const b = computeErrorFingerprint('CLIENT_REACT', '/login', 'Auth failed');
    expect(a).not.toBe(b);
  });

  it('url이 null이어도 fingerprint 계산 가능', () => {
    const fp = computeErrorFingerprint('CLIENT_JS', null, 'Uncaught TypeError');
    expect(fp).toMatch(/^[0-9a-f]{16}$/);
  });
});
