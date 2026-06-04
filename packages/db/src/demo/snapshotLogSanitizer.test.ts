import { describe, expect, it } from 'vitest';

import {
  anonymizeIp,
  anonymizeUserAgent,
  remapAuditEntityId,
  sanitizeSnapshotJson,
  type SnapshotIdMaps,
} from './snapshotLogSanitizer';

describe('snapshotLogSanitizer', () => {
  it('redacts sensitive keys recursively', () => {
    const result = sanitizeSnapshotJson({
      ok: 'visible',
      token: 'secret-token',
      nested: {
        email: 'admin@example.com',
        values: [{ ipAddress: '127.0.0.1' }, { label: 'safe' }],
      },
    });

    expect(result).toEqual({
      ok: 'visible',
      token: '[REDACTED]',
      nested: {
        email: '[REDACTED]',
        values: [{ ipAddress: '[REDACTED]' }, { label: 'safe' }],
      },
    });
  });

  it('anonymizes IP and user agent only when present', () => {
    expect(anonymizeIp('127.0.0.1')).toBe('0.0.0.0');
    expect(anonymizeIp(null)).toBeNull();
    expect(anonymizeUserAgent('Mozilla/5.0')).toBe('Demo Snapshot');
    expect(anonymizeUserAgent(null)).toBeNull();
  });

  it('remaps audit entity ids by entity type', () => {
    const maps: SnapshotIdMaps = {
      Role: new Map([['role-old', 'role-new']]),
      User: new Map(),
      Media: new Map(),
      SiteSettings: new Map(),
      NavigationMenu: new Map(),
      Board: new Map(),
      HomeSection: new Map(),
      Subpage: new Map([['sub-old', 'sub-new']]),
      Post: new Map(),
      PageBlock: new Map(),
      HomePopup: new Map(),
      NavigationMenuItem: new Map(),
      SubpageVersion: new Map(),
      SubpageFeedback: new Map(),
      ErrorLog: new Map([['err-old', 'err-new']]),
    };

    expect(remapAuditEntityId('SUBPAGE', 'sub-old', maps)).toBe('sub-new');
    expect(remapAuditEntityId('ROLE', 'role-old', maps)).toBe('role-new');
    expect(remapAuditEntityId('ERROR_LOG', 'err-old', maps)).toBe('err-new');
    expect(remapAuditEntityId('POST', 'missing', maps)).toBeNull();
  });
});
