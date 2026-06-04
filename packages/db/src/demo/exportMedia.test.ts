import { describe, expect, it } from 'vitest';

import { processMediaForExport } from './exportMedia';

describe('processMediaForExport', () => {
  it('keeps PNG as-is to preserve transparency', async () => {
    const buffer = Buffer.from('not-a-real-png');

    const result = await processMediaForExport(buffer, 'image/png');

    expect(result.mimeType).toBe('image/png');
    expect(result.size).toBe(buffer.length);
    expect(result.base64Data).toBe(buffer.toString('base64'));
  });

  it('keeps WEBP as-is to preserve transparency', async () => {
    const buffer = Buffer.from('not-a-real-webp');

    const result = await processMediaForExport(buffer, 'image/webp');

    expect(result.mimeType).toBe('image/webp');
    expect(result.size).toBe(buffer.length);
    expect(result.base64Data).toBe(buffer.toString('base64'));
  });
});
