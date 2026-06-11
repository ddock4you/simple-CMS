import { describe, expect, it } from 'vitest';

import {
  CLEANUP_DELETE_ORDER,
  CLONE_MODEL_NAMES,
  DEMO_ISOLATED_MODEL_NAMES,
  SEED_RESET_DELETE_ORDER,
  SNAPSHOT_MODEL_NAMES,
} from './modelRegistry';
import { snapshotModelsSchema } from './snapshot.types';

describe('demo model registry', () => {
  it('keeps snapshot payload schema and registry in sync', () => {
    expect(Object.keys(snapshotModelsSchema.shape)).toEqual(
      SNAPSHOT_MODEL_NAMES,
    );
  });

  it('uses the same model list for snapshot and seed cloning', () => {
    expect(CLONE_MODEL_NAMES).toBe(SNAPSHOT_MODEL_NAMES);
  });

  it('covers every isolated model in cleanup order', () => {
    expect([...CLEANUP_DELETE_ORDER].sort()).toEqual(
      [...DEMO_ISOLATED_MODEL_NAMES].sort(),
    );
  });

  it('keeps seed reset cleanup aligned with isolated model cleanup', () => {
    expect(SEED_RESET_DELETE_ORDER).toEqual(CLEANUP_DELETE_ORDER);
  });

  it('deletes child models before parent models', () => {
    const indexOf = (model: string) =>
      CLEANUP_DELETE_ORDER.indexOf(model as never);

    expect(indexOf('NavigationMenuItem')).toBeLessThan(
      indexOf('NavigationMenu'),
    );
    expect(indexOf('SubpageFeedback')).toBeLessThan(indexOf('Subpage'));
    expect(indexOf('SubpageVersion')).toBeLessThan(indexOf('Subpage'));
    expect(indexOf('PageBlock')).toBeLessThan(indexOf('Subpage'));
    expect(indexOf('Post')).toBeLessThan(indexOf('Board'));
    expect(indexOf('PreviewToken')).toBeLessThan(indexOf('User'));
    expect(indexOf('User')).toBeLessThan(indexOf('Role'));
  });
});
