import { SEED_SENTINEL } from '../sessionContext';
import type { SnapshotMediaRow } from '../snapshot.types';

import type { SnapshotIdMaps } from './idMaps';

export interface SnapshotMediaUploadResult {
  mediaIdMap: Map<string, string>;
  mediaUrlMap: Map<string, string>;
  mediaFilesUploaded: number;
  errors: string[];
}

export async function uploadSnapshotMedia(
  mediaRows: SnapshotMediaRow[],
  idMaps: SnapshotIdMaps,
  uploadMedia: (
    storageKey: string,
    buffer: Buffer,
    mimeType: string,
  ) => Promise<string>,
): Promise<SnapshotMediaUploadResult> {
  const mediaIdMap = idMaps.Media;
  const mediaUrlMap = new Map<string, string>();
  const errors: string[] = [];
  let mediaFilesUploaded = 0;

  for (const media of mediaRows) {
    try {
      const buffer = Buffer.from(media.base64Data, 'base64');
      const category = extractCategoryFromUrl(media.url) ?? 'home';
      const newKey = `${SEED_SENTINEL}/${category}/${media.filename}`;
      const newUrl = await uploadMedia(newKey, buffer, media.mimeType);
      mediaUrlMap.set(media.id, newUrl);
      mediaFilesUploaded += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`media[${media.id}] upload: ${msg}`);
      // 파일 upload 실패 시에도 DB row는 적재 (url은 source 그대로 — broken image 표시)
      mediaUrlMap.set(media.id, media.url);
    }
  }

  return { mediaIdMap, mediaUrlMap, mediaFilesUploaded, errors };
}

/** url에서 category 부분 추출 (`/uploads/home/abc.jpg` → `home`) */
export function extractCategoryFromUrl(url: string): string | null {
  const localMatch = url.match(/^\/+uploads\/([a-z0-9-]+)\//i);
  if (localMatch) return localMatch[1]!;

  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      return parts[parts.length - 2]!;
    }
  } catch {
    // not a URL
  }
  return null;
}
