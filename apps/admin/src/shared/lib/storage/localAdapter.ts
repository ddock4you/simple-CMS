import { randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type {
  StorageAdapter,
  StorageUploadInput,
  StorageUploadResult,
} from './types';

/**
 * 로컬 파일시스템 어댑터.
 * 저장 위치: `apps/web/public/uploads/{category}/{filename}`
 * 공개 URL: `/uploads/{category}/{filename}` (web이 자동 서빙)
 *
 * 저장 경로는 admin 프로세스의 CWD를 기준으로 한 상대 경로로 계산.
 * CWD는 보통 `apps/admin`이므로 상위 `../web/public/uploads`로 접근.
 * 모노레포 환경에서만 안전. 별도 서버 배포 시엔 Supabase/S3 권장.
 */
export class LocalStorageAdapter implements StorageAdapter {
  constructor(
    /** web public 디렉토리의 절대 경로 */
    private readonly publicDir: string,
  ) {}

  async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
    const { buffer, originalFilename, category } = input;

    // 카테고리 sanitize (영숫자 + 하이픈만 허용)
    const safeCategory = category.replace(/[^a-z0-9-]/gi, '').toLowerCase();
    if (!safeCategory) {
      throw new Error('유효하지 않은 카테고리입니다.');
    }

    // 파일명 생성: {timestamp}-{uuid}.{ext}
    const ext = path.extname(originalFilename).toLowerCase();
    const safeExt = ext.replace(/[^a-z0-9.]/gi, '');
    const filename = `${Date.now()}-${randomUUID()}${safeExt}`;

    // 경로 구성 (traversal 방어 — path.join 결과가 publicDir 하위에 있는지 확인)
    const categoryDir = path.resolve(this.publicDir, 'uploads', safeCategory);
    const filepath = path.resolve(categoryDir, filename);
    if (
      !filepath.startsWith(
        path.resolve(this.publicDir, 'uploads') + path.sep,
      )
    ) {
      throw new Error('경로가 유효하지 않습니다.');
    }

    await mkdir(categoryDir, { recursive: true });
    await writeFile(filepath, buffer);

    const storageKey = `uploads/${safeCategory}/${filename}`;
    return {
      url: `/${storageKey}`,
      storageKey,
      filename,
    };
  }

  async delete(storageKey: string): Promise<void> {
    // storageKey 정규화 — 외부에서 들어온 값이 traversal을 시도하지 못하도록 검증
    const normalized = storageKey.replace(/^\/+/, '');
    const filepath = path.resolve(this.publicDir, normalized);
    const uploadsRoot = path.resolve(this.publicDir, 'uploads');
    if (!filepath.startsWith(uploadsRoot + path.sep)) {
      console.error(
        `[LocalStorageAdapter] 잘못된 storageKey 삭제 시도: ${storageKey}`,
      );
      return;
    }

    try {
      await unlink(filepath);
    } catch (err) {
      // ENOENT 포함, 삭제 실패는 throw하지 않음 (고아 파일 배치로 정리)
      console.error(
        `[LocalStorageAdapter] 파일 삭제 실패 (${storageKey}):`,
        err,
      );
    }
  }

  urlToStorageKey(url: string): string | null {
    // local URL 형식: `/uploads/{category}/{filename}` (절대 경로, 호스트 없음)
    if (!url.startsWith('/uploads/')) return null;
    return url.replace(/^\/+/, '');
  }
}
