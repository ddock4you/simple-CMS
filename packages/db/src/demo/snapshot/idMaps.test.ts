import { describe, expect, it } from 'vitest';

import { SNAPSHOT_MODEL_NAMES } from '../modelRegistry';
import type { SnapshotPayload } from '../snapshot.types';

import { buildSnapshotIdMaps, createEmptySnapshotIdMaps } from './idMaps';

function createEmptyPayload(): SnapshotPayload {
  return {
    schemaVersion: 2,
    exportedAt: '2026-06-12T00:00:00.000Z',
    models: Object.fromEntries(
      SNAPSHOT_MODEL_NAMES.map((name) => [name, []]),
    ) as unknown as SnapshotPayload['models'],
  };
}

describe('snapshot idMaps', () => {
  it('creates a map for every snapshot model', () => {
    expect(Object.keys(createEmptySnapshotIdMaps())).toEqual(
      SNAPSHOT_MODEL_NAMES,
    );
  });

  it('builds deterministic coverage from payload model registry', () => {
    const payload = createEmptyPayload();
    payload.models.Role = [
      {
        id: 'role-source',
        name: 'role',
        description: null,
        permissions: {},
        isSystem: true,
        isDefault: false,
      },
    ];

    const idMaps = buildSnapshotIdMaps(payload);

    expect(Object.keys(idMaps)).toEqual(SNAPSHOT_MODEL_NAMES);
    expect(idMaps.Role.get('role-source')).toEqual(expect.any(String));
    expect(idMaps.User.size).toBe(0);
  });
});
