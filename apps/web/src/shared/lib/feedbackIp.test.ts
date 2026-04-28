import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { extractIp, hashIp } from './feedbackIp';

describe('extractIp', () => {
  it('returns null when no relevant headers are present', () => {
    const req = new Request('http://localhost/');
    expect(extractIp(req)).toBeNull();
  });

  it('returns the first IP from an x-forwarded-for chain', () => {
    const req = new Request('http://localhost/', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8, 9.10.11.12' },
    });
    expect(extractIp(req)).toBe('1.2.3.4');
  });

  it('returns the single IP from x-forwarded-for', () => {
    const req = new Request('http://localhost/', {
      headers: { 'x-forwarded-for': '1.2.3.4' },
    });
    expect(extractIp(req)).toBe('1.2.3.4');
  });

  it('trims whitespace from the x-forwarded-for value', () => {
    const req = new Request('http://localhost/', {
      headers: { 'x-forwarded-for': '  1.2.3.4  , 5.6.7.8' },
    });
    expect(extractIp(req)).toBe('1.2.3.4');
  });

  it('falls back to x-real-ip when x-forwarded-for is absent', () => {
    const req = new Request('http://localhost/', {
      headers: { 'x-real-ip': '5.6.7.8' },
    });
    expect(extractIp(req)).toBe('5.6.7.8');
  });

  it('trims whitespace from the x-real-ip value', () => {
    const req = new Request('http://localhost/', {
      headers: { 'x-real-ip': '  5.6.7.8  ' },
    });
    expect(extractIp(req)).toBe('5.6.7.8');
  });

  it('prefers x-forwarded-for over x-real-ip', () => {
    const req = new Request('http://localhost/', {
      headers: {
        'x-forwarded-for': '1.2.3.4',
        'x-real-ip': '5.6.7.8',
      },
    });
    expect(extractIp(req)).toBe('1.2.3.4');
  });

  it('handles IPv6 addresses in x-forwarded-for', () => {
    const req = new Request('http://localhost/', {
      headers: { 'x-forwarded-for': '2001:db8::1, 1.2.3.4' },
    });
    expect(extractIp(req)).toBe('2001:db8::1');
  });
});

describe('hashIp', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    delete process.env.FEEDBACK_IP_SALT;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns a 64-character lowercase hex string', () => {
    vi.stubEnv('FEEDBACK_IP_SALT', 'test-salt');
    const result = hashIp('1.2.3.4');
    expect(result).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is deterministic: same IP + salt → same hash', () => {
    vi.stubEnv('FEEDBACK_IP_SALT', 'test-salt');
    expect(hashIp('1.2.3.4')).toBe(hashIp('1.2.3.4'));
  });

  it('produces different hashes for different IPs', () => {
    vi.stubEnv('FEEDBACK_IP_SALT', 'test-salt');
    expect(hashIp('1.2.3.4')).not.toBe(hashIp('5.6.7.8'));
  });

  it('produces different hashes for different salts', () => {
    vi.stubEnv('FEEDBACK_IP_SALT', 'salt-a');
    const hashA = hashIp('1.2.3.4');
    vi.stubEnv('FEEDBACK_IP_SALT', 'salt-b');
    const hashB = hashIp('1.2.3.4');
    expect(hashA).not.toBe(hashB);
  });

  it('emits a console.warn when FEEDBACK_IP_SALT is not set', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    hashIp('1.2.3.4');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('FEEDBACK_IP_SALT'),
    );
    warnSpy.mockRestore();
  });

  it('still returns a valid hash when FEEDBACK_IP_SALT is not set (uses fallback)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = hashIp('1.2.3.4');
    expect(result).toMatch(/^[a-f0-9]{64}$/);
    warnSpy.mockRestore();
  });

  it('handles IPv6 addresses', () => {
    vi.stubEnv('FEEDBACK_IP_SALT', 'test-salt');
    const ipv6Hash = hashIp('2001:db8::1');
    expect(ipv6Hash).toMatch(/^[a-f0-9]{64}$/);
    expect(ipv6Hash).not.toBe(hashIp('1.2.3.4'));
  });
});
