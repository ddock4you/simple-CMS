import { createId } from '@paralleldrive/cuid2';

import { SNAPSHOT_MODEL_NAMES, type SnapshotModelName } from '../modelRegistry';
import type { SnapshotPayload } from '../snapshot.types';

export type SnapshotIdMaps = Record<SnapshotModelName, Map<string, string>>;

export function createEmptySnapshotIdMaps(): SnapshotIdMaps {
  return Object.fromEntries(
    SNAPSHOT_MODEL_NAMES.map((name) => [name, new Map<string, string>()]),
  ) as SnapshotIdMaps;
}

export function buildSnapshotIdMaps(payload: SnapshotPayload): SnapshotIdMaps {
  const idMaps = createEmptySnapshotIdMaps();

  for (const name of SNAPSHOT_MODEL_NAMES) {
    const rows = payload.models[name] as Array<{ id: string }>;
    const map = idMaps[name];
    for (const row of rows) {
      map.set(row.id, createId());
    }
  }

  return idMaps;
}
