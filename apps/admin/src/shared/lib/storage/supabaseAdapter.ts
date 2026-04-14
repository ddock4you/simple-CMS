import { randomUUID } from 'node:crypto';
import path from 'node:path';

import { createClient } from '@supabase/supabase-js';

import type {
  StorageAdapter,
  StorageUploadInput,
  StorageUploadResult,
} from './types';

/**
 * Supabase Storage 어댑터.
 *
 * 필요 환경변수:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY (서버 전용, 절대 클라이언트 노출 금지)
 * - SUPABASE_STORAGE_BUCKET (기본: 'uploads')
 *
 * 버킷은 미리 대시보드/CLI로 생성해두고 public read 권한 설정 필요.
 */
export class SupabaseStorageAdapter implements StorageAdapter {
  private readonly client;
  private readonly bucket: string;

  constructor(config: {
    url: string;
    serviceRoleKey: string;
    bucket: string;
  }) {
    this.client = createClient(config.url, config.serviceRoleKey, {
      auth: { persistSession: false },
    });
    this.bucket = config.bucket;
  }

  async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
    const { buffer, originalFilename, mimeType, category } = input;

    const safeCategory = category.replace(/[^a-z0-9-]/gi, '').toLowerCase();
    if (!safeCategory) {
      throw new Error('유효하지 않은 카테고리입니다.');
    }

    const ext = path.extname(originalFilename).toLowerCase();
    const safeExt = ext.replace(/[^a-z0-9.]/gi, '');
    const filename = `${Date.now()}-${randomUUID()}${safeExt}`;
    const storageKey = `${safeCategory}/${filename}`;

    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(storageKey, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      throw new Error(`Supabase 업로드 실패: ${error.message}`);
    }

    const {
      data: { publicUrl },
    } = this.client.storage.from(this.bucket).getPublicUrl(storageKey);

    return {
      url: publicUrl,
      storageKey,
      filename,
    };
  }

  async delete(storageKey: string): Promise<void> {
    const { error } = await this.client.storage
      .from(this.bucket)
      .remove([storageKey]);
    if (error) {
      console.error(
        `[SupabaseStorageAdapter] 파일 삭제 실패 (${storageKey}):`,
        error,
      );
    }
  }

  urlToStorageKey(url: string): string | null {
    // Supabase 공개 URL 형식:
    //   https://{host}/storage/v1/object/public/{bucket}/{key}
    try {
      const parsed = new URL(url);
      const marker = `/storage/v1/object/public/${this.bucket}/`;
      const idx = parsed.pathname.indexOf(marker);
      if (idx === -1) return null;
      const key = parsed.pathname.slice(idx + marker.length);
      return key || null;
    } catch {
      return null;
    }
  }
}
