import { describe, expect, it } from 'vitest';

import { SEED_SENTINEL } from '../sessionContext';
import type { SnapshotMediaRow } from '../snapshot.types';

import { createEmptySnapshotIdMaps } from './idMaps';
import { extractCategoryFromUrl, uploadSnapshotMedia } from './mediaUpload';

describe('snapshot media upload helpers', () => {
  it('extracts category from local and Supabase URLs', () => {
    expect(extractCategoryFromUrl('/uploads/home/a.jpg')).toBe('home');
    expect(
      extractCategoryFromUrl(
        'https://example.supabase.co/storage/v1/object/public/uploads/__PROD__/media/a.jpg',
      ),
    ).toBe('media');
    expect(extractCategoryFromUrl('not-a-url')).toBeNull();
  });

  it('uploads media to the seed prefix and preserves URL on upload failure', async () => {
    const rows: SnapshotMediaRow[] = [
      {
        id: 'media-1',
        filename: 'a.jpg',
        originalFilename: 'a.jpg',
        mimeType: 'image/jpeg',
        size: 3,
        url: '/uploads/home/a.jpg',
        alt: null,
        contentHash: null,
        uploadedById: null,
        base64Data: Buffer.from('one').toString('base64'),
      },
      {
        id: 'media-2',
        filename: 'b.jpg',
        originalFilename: 'b.jpg',
        mimeType: 'image/jpeg',
        size: 3,
        url: '/uploads/popup/b.jpg',
        alt: null,
        contentHash: null,
        uploadedById: null,
        base64Data: Buffer.from('two').toString('base64'),
      },
    ];
    const idMaps = createEmptySnapshotIdMaps();
    idMaps.Media.set('media-1', 'new-media-1');
    idMaps.Media.set('media-2', 'new-media-2');
    const seenKeys: string[] = [];

    const result = await uploadSnapshotMedia(rows, idMaps, async (key) => {
      seenKeys.push(key);
      if (key.endsWith('/b.jpg')) throw new Error('boom');
      return `https://storage/${key}`;
    });

    expect(seenKeys).toEqual([
      `${SEED_SENTINEL}/home/a.jpg`,
      `${SEED_SENTINEL}/popup/b.jpg`,
    ]);
    expect(result.mediaIdMap.get('media-1')).toBe('new-media-1');
    expect(result.mediaUrlMap.get('media-1')).toBe(
      `${'https://storage'}/${SEED_SENTINEL}/home/a.jpg`,
    );
    expect(result.mediaUrlMap.get('media-2')).toBe('/uploads/popup/b.jpg');
    expect(result.mediaFilesUploaded).toBe(1);
    expect(result.errors[0]).toContain('boom');
  });
});
