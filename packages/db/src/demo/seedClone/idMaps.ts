import { createId } from '@paralleldrive/cuid2';

import { CLONE_MODEL_NAMES, type CloneModelName } from '../modelRegistry';

export type SeedCloneIdMaps = Record<CloneModelName, Map<string, string>>;

export function createSeedCloneIdMaps(): SeedCloneIdMaps {
  return Object.fromEntries(
    CLONE_MODEL_NAMES.map((name) => [name, new Map<string, string>()]),
  ) as SeedCloneIdMaps;
}

export function getOrCreateSeedCloneId(
  idMaps: SeedCloneIdMaps,
  model: CloneModelName,
  sourceId: string,
): string {
  const map = idMaps[model];
  const existing = map.get(sourceId);
  if (existing) return existing;

  const nextId = createId();
  map.set(sourceId, nextId);
  return nextId;
}

export function getSeedCloneId(
  idMaps: SeedCloneIdMaps,
  model: CloneModelName,
  sourceId: string | null,
): string | null {
  if (!sourceId) return null;
  return idMaps[model].get(sourceId) ?? null;
}
