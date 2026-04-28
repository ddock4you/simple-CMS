import { describe, expect, it } from 'vitest';

import { getAuditContext } from './auditHelpers';

function makeRequest(headers: Record<string, string>): Request {
  return new Request('http://localhost/', { headers });
}

describe('getAuditContext', () => {
  it('x-forwarded-for 체인에서 첫 번째 IP 추출', () => {
    const req = makeRequest({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8, 9.0.1.2' });
    expect(getAuditContext(req).ipAddress).toBe('1.2.3.4');
  });

  it('x-forwarded-for 단일 IP', () => {
    const req = makeRequest({ 'x-forwarded-for': '192.168.0.1' });
    expect(getAuditContext(req).ipAddress).toBe('192.168.0.1');
  });

  it('x-forwarded-for 값의 앞뒤 공백 트림', () => {
    const req = makeRequest({ 'x-forwarded-for': '  10.0.0.1  , 10.0.0.2' });
    expect(getAuditContext(req).ipAddress).toBe('10.0.0.1');
  });

  it('x-forwarded-for 헤더 없으면 ipAddress = null', () => {
    const req = makeRequest({ 'user-agent': 'TestBot/1.0' });
    expect(getAuditContext(req).ipAddress).toBeNull();
  });

  it('user-agent 추출', () => {
    const req = makeRequest({ 'user-agent': 'Mozilla/5.0 (Windows NT 10.0)' });
    expect(getAuditContext(req).userAgent).toBe('Mozilla/5.0 (Windows NT 10.0)');
  });

  it('user-agent 헤더 없으면 userAgent = null', () => {
    const req = makeRequest({});
    expect(getAuditContext(req).userAgent).toBeNull();
  });

  it('빈 user-agent 문자열 → null', () => {
    const req = makeRequest({ 'user-agent': '' });
    expect(getAuditContext(req).userAgent).toBeNull();
  });

  it('두 헤더 모두 없으면 둘 다 null', () => {
    const { ipAddress, userAgent } = getAuditContext(makeRequest({}));
    expect(ipAddress).toBeNull();
    expect(userAgent).toBeNull();
  });

  it('IPv6 주소 추출', () => {
    const req = makeRequest({ 'x-forwarded-for': '::1, 2001:db8::1' });
    expect(getAuditContext(req).ipAddress).toBe('::1');
  });
});
