import { describe, it, expect } from 'vitest';

import type {
  PageBlockListItem,
  SubpageVersionSnapshotBlock,
} from '@simple-cms/types';

import { summarizeBlockDiff } from './summarizeBlockDiff';

function snapshotBlock(
  overrides: Partial<SubpageVersionSnapshotBlock>,
): SubpageVersionSnapshotBlock {
  return {
    blockType: 'RICH_TEXT',
    configJson: { contentJson: { type: 'doc', content: [] } },
    isVisible: true,
    displayOrder: 0,
    ...overrides,
  };
}

function currentBlock(
  overrides: Partial<PageBlockListItem>,
): PageBlockListItem {
  return {
    id: `block-${Math.random()}`,
    subpageId: 'subpage-1',
    blockType: 'RICH_TEXT',
    configJson: { contentJson: { type: 'doc', content: [] } },
    isVisible: true,
    displayOrder: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('summarizeBlockDiff', () => {
  it('returns all zeros when both empty', () => {
    const result = summarizeBlockDiff([], []);
    expect(result).toEqual({ added: 0, removed: 0, modified: 0, unchanged: 0 });
  });

  it('reports unchanged when snapshot matches current exactly', () => {
    const snap = [snapshotBlock({ displayOrder: 0 })];
    const curr = [currentBlock({ displayOrder: 0 })];
    const result = summarizeBlockDiff(snap, curr);
    expect(result.unchanged).toBe(1);
    expect(result.added).toBe(0);
    expect(result.removed).toBe(0);
    expect(result.modified).toBe(0);
  });

  it('counts current-only blocks as added', () => {
    const result = summarizeBlockDiff(
      [],
      [currentBlock({ displayOrder: 0 }), currentBlock({ displayOrder: 1 })],
    );
    expect(result.added).toBe(2);
  });

  it('counts snapshot-only blocks as removed', () => {
    const result = summarizeBlockDiff(
      [snapshotBlock({ displayOrder: 0 })],
      [],
    );
    expect(result.removed).toBe(1);
  });

  it('detects blockType change as modified', () => {
    const snap = [snapshotBlock({ displayOrder: 0, blockType: 'RICH_TEXT' })];
    const curr = [currentBlock({ displayOrder: 0, blockType: 'HTML' })];
    const result = summarizeBlockDiff(snap, curr);
    expect(result.modified).toBe(1);
  });

  it('detects isVisible toggle as modified', () => {
    const snap = [snapshotBlock({ displayOrder: 0, isVisible: true })];
    const curr = [currentBlock({ displayOrder: 0, isVisible: false })];
    const result = summarizeBlockDiff(snap, curr);
    expect(result.modified).toBe(1);
  });

  it('detects configJson content change as modified', () => {
    const snap = [
      snapshotBlock({
        displayOrder: 0,
        configJson: { text: 'old' },
      }),
    ];
    const curr = [
      currentBlock({
        displayOrder: 0,
        configJson: { text: 'new' },
      }),
    ];
    const result = summarizeBlockDiff(snap, curr);
    expect(result.modified).toBe(1);
  });

  it('ignores object key order in configJson', () => {
    const snap = [
      snapshotBlock({
        displayOrder: 0,
        configJson: { a: 1, b: 2 },
      }),
    ];
    const curr = [
      currentBlock({
        displayOrder: 0,
        configJson: { b: 2, a: 1 },
      }),
    ];
    const result = summarizeBlockDiff(snap, curr);
    expect(result.unchanged).toBe(1);
    expect(result.modified).toBe(0);
  });

  it('combines add, remove, modify in a realistic scenario', () => {
    const snap: SubpageVersionSnapshotBlock[] = [
      snapshotBlock({ displayOrder: 0, blockType: 'RICH_TEXT' }),
      snapshotBlock({ displayOrder: 1, blockType: 'IMAGE' }),
      snapshotBlock({ displayOrder: 2, blockType: 'HTML' }),
    ];
    const curr: PageBlockListItem[] = [
      currentBlock({ displayOrder: 0, blockType: 'RICH_TEXT' }),  // unchanged
      currentBlock({ displayOrder: 1, blockType: 'IFRAME' }),     // modified (type change)
      // displayOrder 2 removed
      currentBlock({ displayOrder: 3, blockType: 'IMAGE' }),      // added
    ];
    const result = summarizeBlockDiff(snap, curr);
    expect(result.unchanged).toBe(1);
    expect(result.modified).toBe(1);
    expect(result.removed).toBe(1);
    expect(result.added).toBe(1);
  });
});
