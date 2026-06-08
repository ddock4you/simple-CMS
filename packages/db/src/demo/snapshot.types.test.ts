import { describe, expect, it } from 'vitest';

import {
  SNAPSHOT_SCHEMA_VERSION,
  snapshotPayloadSchema,
} from './snapshot.types';

function createEmptyModels() {
  return {
    Role: [],
    User: [],
    Media: [],
    SiteSettings: [],
    NavigationMenu: [],
    Board: [],
    HomeSection: [],
    Subpage: [],
    Post: [],
    PageBlock: [],
    HomePopup: [],
    NavigationMenuItem: [],
    SubpageVersion: [],
    SubpageFeedback: [],
  };
}

describe('snapshotPayloadSchema', () => {
  it('ignores legacy AuditLog/ErrorLog arrays during parse', () => {
    const parsed = snapshotPayloadSchema.parse({
      schemaVersion: SNAPSHOT_SCHEMA_VERSION,
      exportedAt: '2026-06-08T00:00:00.000Z',
      models: {
        ...createEmptyModels(),
        AuditLog: [
          {
            id: 'audit-old',
            action: 'LOGIN',
            entityType: null,
            entityId: null,
            entityTitle: null,
            changes: null,
            userId: null,
            ipAddress: '127.0.0.1',
            userAgent: 'test',
            createdAt: '2026-06-08T00:00:00.000Z',
          },
        ],
        ErrorLog: [
          {
            id: 'error-old',
            level: 'ERROR',
            source: 'CLIENT_JS',
            message: 'legacy error',
            stack: null,
            url: null,
            method: null,
            statusCode: null,
            userAgent: 'test',
            ipAddress: '127.0.0.1',
            referer: null,
            digest: null,
            fingerprint: null,
            metadata: null,
            isResolved: false,
            resolvedAt: null,
            resolvedBy: null,
            createdAt: '2026-06-08T00:00:00.000Z',
          },
        ],
      },
    });

    expect('AuditLog' in parsed.models).toBe(false);
    expect('ErrorLog' in parsed.models).toBe(false);
  });
});
