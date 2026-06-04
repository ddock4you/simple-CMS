/**
 * 시연 모드 snapshot export 시 Media 바이너리 처리.
 *
 * - provider 분기 (local fs / Supabase Storage)로 buffer 회수
 * - JPEG만 sharp 1600px 리사이즈 + JPEG quality 80
 * - PNG / WEBP / SVG / GIF / non-image (PDF 등)는 원본 유지 (transparent / animation 손실 방지)
 * - base64 인코딩
 *
 * 호출 측: exportSnapshot.ts가 각 Media row마다 이 함수를 invoke.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

import sharp from 'sharp';

const RESIZE_MAX_WIDTH = 1600;
const JPEG_QUALITY = 80;

/**
 * 이미지 mimeType — sharp 리사이즈 대상.
 * PNG/WEBP는 투명 배경이 로고/파비콘에서 중요하므로 JPEG 변환하지 않는다.
 * SVG (vector, 리사이즈 무의미), GIF (animation 손실), ICO (favicon 단일 사이즈) 제외.
 */
const RESIZABLE_IMAGE_MIME_PREFIXES = ['image/jpeg'];

function isResizableImage(mimeType: string): boolean {
  return RESIZABLE_IMAGE_MIME_PREFIXES.some((prefix) =>
    mimeType.toLowerCase().startsWith(prefix),
  );
}

export interface ProcessedMediaResult {
  base64Data: string;
  /** sharp 리사이즈 후 변경된 mimeType (미적용 시 input 동일) */
  mimeType: string;
  /** 처리 후 byte size */
  size: number;
}

/**
 * Media buffer를 sharp 리사이즈(이미지 한정) 후 base64로 변환.
 *
 * @param buffer - 원본 binary
 * @param mimeType - 원본 mimeType
 * @returns 리사이즈/변환된 base64 + mimeType + size
 */
export async function processMediaForExport(
  buffer: Buffer,
  mimeType: string,
): Promise<ProcessedMediaResult> {
  if (!isResizableImage(mimeType)) {
    return {
      base64Data: buffer.toString('base64'),
      mimeType,
      size: buffer.length,
    };
  }

  try {
    const resized = await sharp(buffer)
      .resize({ width: RESIZE_MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer();

    // sharp가 .jpeg()로 통일했으므로 mimeType도 image/jpeg
    return {
      base64Data: resized.toString('base64'),
      mimeType: 'image/jpeg',
      size: resized.length,
    };
  } catch (err) {
    // sharp 실패 시 원본 그대로 (방어적)
    console.error('[exportMedia] sharp resize failed:', err);
    return {
      base64Data: buffer.toString('base64'),
      mimeType,
      size: buffer.length,
    };
  }
}

// ─── provider별 Media downloader ──────────────────────

/** local 파일시스템 — `apps/web/public/uploads/...` 절대 경로에서 readFile */
export function createLocalMediaDownloader(
  publicDir: string,
): (storageKey: string) => Promise<Buffer> {
  return async (storageKey: string) => {
    // storageKey 형식: `uploads/<category>/<filename>` (LocalStorageAdapter)
    const normalized = storageKey.replace(/^\/+/, '');
    const filepath = path.resolve(publicDir, normalized);
    const uploadsRoot = path.resolve(publicDir, 'uploads');
    if (!filepath.startsWith(uploadsRoot + path.sep)) {
      throw new Error(`잘못된 storageKey: ${storageKey}`);
    }
    return fs.readFile(filepath);
  };
}

/**
 * Supabase Storage downloader.
 * 호출자가 supabase client를 만들어 download 함수 callback 형태로 주입.
 * (packages/db에 supabase-js 의존성 추가 회피)
 */
export interface SupabaseDownloader {
  download(
    key: string,
  ): Promise<{ data: Blob | null; error: { message: string } | null }>;
}

export function createSupabaseMediaDownloader(
  storage: SupabaseDownloader,
): (storageKey: string) => Promise<Buffer> {
  return async (storageKey: string) => {
    const { data, error } = await storage.download(storageKey);
    if (error || !data) {
      throw new Error(
        `Supabase download 실패 (${storageKey}): ${error?.message ?? 'no data'}`,
      );
    }
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  };
}

/** URL → storageKey 추출 헬퍼 (어댑터별 분기) */
export function extractStorageKeyFromUrl(
  url: string,
  provider: 'local' | 'supabase',
  supabaseBucket?: string,
): string | null {
  if (provider === 'local') {
    if (!url.startsWith('/uploads/')) return null;
    return url.replace(/^\/+/, '');
  }
  // Supabase: `https://{host}/storage/v1/object/public/{bucket}/{key}`
  if (!supabaseBucket) return null;
  try {
    const parsed = new URL(url);
    const marker = `/storage/v1/object/public/${supabaseBucket}/`;
    const idx = parsed.pathname.indexOf(marker);
    if (idx === -1) return null;
    return parsed.pathname.slice(idx + marker.length) || null;
  } catch {
    return null;
  }
}
