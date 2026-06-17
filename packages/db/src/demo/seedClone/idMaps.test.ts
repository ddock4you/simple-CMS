import { describe, expect, it } from 'vitest';

import { CLONE_MODEL_NAMES } from '../modelRegistry';

import {
  createSeedCloneIdMaps,
  getOrCreateSeedCloneId,
  getSeedCloneId,
} from './idMaps';

describe('seed clone idMaps', () => {
  it('creates a map for every clone model', () => {
    expect(Object.keys(createSeedCloneIdMaps())).toEqual(CLONE_MODEL_NAMES);
  });

  it('returns stable generated ids per source id', () => {
    const idMaps = createSeedCloneIdMaps();
    const first = getOrCreateSeedCloneId(idMaps, 'Subpage', 'source-id');
    const second = getOrCreateSeedCloneId(idMaps, 'Subpage', 'source-id');

    expect(first).toBe(second);
    expect(getSeedCloneId(idMaps, 'Subpage', 'source-id')).toBe(first);
    expect(getSeedCloneId(idMaps, 'Subpage', null)).toBeNull();
  });
});
