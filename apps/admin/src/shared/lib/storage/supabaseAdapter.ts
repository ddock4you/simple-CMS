import { randomUUID } from 'node:crypto';
import path from 'node:path';

import { demo } from '@simple-cms/db';
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

    // DEMO_MODE에서 visitor cuid 또는 '__SEED__' 컨텍스트면 sessionId prefix 추가.
    // cleanup이 sessionId 폴더 단위로 list/remove 가능 + visitor 간 격리.
    // 운영(__PROD__) 또는 비시연 환경은 prefix 없이 기존 동작.
    const sessionId = demo.getCurrentSessionId();
    const isolated =
      process.env.DEMO_MODE === 'true' && sessionId !== demo.PROD_SENTINEL;
    const storageKey = isolated
      ? `${sessionId}/${safeCategory}/${filename}`
      : `${safeCategory}/${filename}`;

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
    // 시드 파일(__SEED__/...)은 visitor 액션으로 삭제 불가 — 모든 시연 visitor가
    // cloneSeedToSession으로 받은 Media.url이 __SEED__/... 경로를 그대로 가리키므로
    // 한 visitor가 라이브러리에서 시드 이미지를 [삭제]하면 모든 다른 visitor의 시드
    // 이미지가 깨진다. 어댑터 단일 게이트로 미디어 DELETE / bulk-delete /
    // bootstrap rollback 등 모든 경로 자동 보호.
    if (
      process.env.DEMO_MODE === 'true' &&
      storageKey.startsWith(`${demo.SEED_SENTINEL}/`)
    ) {
      return;
    }

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

  /**
   * 시연 모드 cleanup용: sessionId 폴더의 모든 파일 일괄 삭제.
   *
   * Supabase Storage `list()`는 1-depth만 반환하므로 2-pass:
   *   sessionId/ → category 폴더 목록 → 각 폴더 안의 파일 → remove(paths)
   *
   * `__SEED__` / `__PROD__`는 호출자 책임으로 미리 제외해야 한다 (RESERVED_SESSION_IDS).
   * 이중 방어: sessionId가 RESERVED면 즉시 return.
   */
  async cleanupSessionFolder(
    sessionId: string,
  ): Promise<{ filesDeleted: number; errors: string[] }> {
    const errors: string[] = [];
    let filesDeleted = 0;

    if (
      sessionId === '__PROD__' ||
      sessionId === '__SEED__' ||
      !sessionId
    ) {
      return { filesDeleted: 0, errors: [] };
    }

    try {
      // 1-pass: sessionId 폴더 안의 카테고리 목록
      const { data: categories, error: listErr } = await this.client.storage
        .from(this.bucket)
        .list(sessionId, { limit: 1000 });

      if (listErr) {
        errors.push(`list(${sessionId}): ${listErr.message}`);
        return { filesDeleted, errors };
      }
      if (!categories || categories.length === 0) {
        return { filesDeleted, errors };
      }

      // 2-pass: 각 카테고리 폴더 안의 파일
      for (const cat of categories) {
        // Supabase: 폴더는 id가 null, 파일은 id 존재. 폴더만 처리
        if (cat.id !== null) continue;

        const prefix = `${sessionId}/${cat.name}`;
        const { data: files, error: filesErr } = await this.client.storage
          .from(this.bucket)
          .list(prefix, { limit: 1000 });

        if (filesErr) {
          errors.push(`list(${prefix}): ${filesErr.message}`);
          continue;
        }
        if (!files || files.length === 0) continue;

        const paths = files
          .filter((f) => f.id !== null)
          .map((f) => `${prefix}/${f.name}`);
        if (paths.length === 0) continue;

        // chunk 1000 (Supabase remove 한도)
        for (let i = 0; i < paths.length; i += 1000) {
          const chunk = paths.slice(i, i + 1000);
          const { error: rmErr } = await this.client.storage
            .from(this.bucket)
            .remove(chunk);
          if (rmErr) {
            errors.push(`remove(${prefix}): ${rmErr.message}`);
          } else {
            filesDeleted += chunk.length;
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(msg);
    }

    return { filesDeleted, errors };
  }

  /**
   * 시연 모드 PR6: `__SEED__/` 폴더 일괄 정리.
   *
   * **이 메소드는 운영자의 명시적 시드 갱신 흐름(import)에서만 호출해야 한다.**
   * `delete()`가 PR5 가드로 `__SEED__/`를 silent 차단하는 것과 분리된 진입점.
   *
   * visitor 액션(미디어 DELETE / bulk-delete) 경로에서 절대 import 금지.
   * 호출자: `resetSeedData()` 헬퍼만 (packages/db).
   *
   * 동작은 `cleanupSessionFolder('__SEED__')`와 동일하지만 RESERVED 가드를
   * 우회 (이 메소드 자체가 명시적 운영자 의도).
   */
  async cleanupSeedFolder(): Promise<{
    filesDeleted: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let filesDeleted = 0;
    const seedPrefix = '__SEED__';

    try {
      const { data: categories, error: listErr } = await this.client.storage
        .from(this.bucket)
        .list(seedPrefix, { limit: 1000 });

      if (listErr) {
        errors.push(`list(${seedPrefix}): ${listErr.message}`);
        return { filesDeleted, errors };
      }
      if (!categories || categories.length === 0) {
        return { filesDeleted, errors };
      }

      for (const cat of categories) {
        if (cat.id !== null) continue;

        const prefix = `${seedPrefix}/${cat.name}`;
        const { data: files, error: filesErr } = await this.client.storage
          .from(this.bucket)
          .list(prefix, { limit: 1000 });

        if (filesErr) {
          errors.push(`list(${prefix}): ${filesErr.message}`);
          continue;
        }
        if (!files || files.length === 0) continue;

        const paths = files
          .filter((f) => f.id !== null)
          .map((f) => `${prefix}/${f.name}`);
        if (paths.length === 0) continue;

        for (let i = 0; i < paths.length; i += 1000) {
          const chunk = paths.slice(i, i + 1000);
          const { error: rmErr } = await this.client.storage
            .from(this.bucket)
            .remove(chunk);
          if (rmErr) {
            errors.push(`remove(${prefix}): ${rmErr.message}`);
          } else {
            filesDeleted += chunk.length;
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(msg);
    }

    return { filesDeleted, errors };
  }

  /**
   * 시연 모드 PR6: `__SEED__/<category>/<filename>` 경로로 직접 upload.
   *
   * `upload()` 메소드는 AsyncLocalStorage의 sessionId를 자동 회수하는데,
   * import CLI/route는 visitor 컨텍스트가 아니라 명시적 `__SEED__` 적재 의도이므로
   * 별도 진입점 제공. 호출자: `importSnapshotToSeed()`.
   *
   * @param storageKey - 명시적 storageKey (예: `__SEED__/home/abc.jpg`)
   * @param buffer - binary
   * @param mimeType - MIME 타입
   * @returns 공개 URL
   */
  async uploadToSeed(
    storageKey: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    if (!storageKey.startsWith('__SEED__/')) {
      throw new Error(
        `uploadToSeed는 __SEED__/ 경로에만 사용 가능합니다: ${storageKey}`,
      );
    }
    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(storageKey, buffer, {
        contentType: mimeType,
        upsert: true, // import는 cleanupSeedFolder 후 호출되지만 안전장치
      });
    if (error) {
      throw new Error(`Supabase upload 실패 (${storageKey}): ${error.message}`);
    }
    const {
      data: { publicUrl },
    } = this.client.storage.from(this.bucket).getPublicUrl(storageKey);
    return publicUrl;
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
