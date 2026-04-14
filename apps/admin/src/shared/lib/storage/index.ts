import path from 'node:path';

import { LocalStorageAdapter } from './localAdapter';
import { SupabaseStorageAdapter } from './supabaseAdapter';
import type { StorageAdapter } from './types';

export type { StorageAdapter, StorageUploadInput, StorageUploadResult } from './types';

/**
 * 환경변수 `STORAGE_PROVIDER`로 어댑터를 선택한다.
 * - `local` (기본): apps/web/public/uploads/ 에 저장
 * - `supabase`: Supabase Storage 사용
 *
 * 싱글턴 패턴으로 요청 간 재사용 (특히 Supabase 클라이언트).
 */
let cachedAdapter: StorageAdapter | null = null;

export function getStorageAdapter(): StorageAdapter {
  if (cachedAdapter) return cachedAdapter;

  const provider = (process.env.STORAGE_PROVIDER ?? 'local').toLowerCase();

  if (provider === 'supabase') {
    const url = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'uploads';

    if (!url || !serviceRoleKey) {
      throw new Error(
        'STORAGE_PROVIDER=supabase이지만 SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다.',
      );
    }

    cachedAdapter = new SupabaseStorageAdapter({ url, serviceRoleKey, bucket });
    return cachedAdapter;
  }

  // 기본값: local
  // admin 프로세스의 CWD가 apps/admin이라 가정 → ../web/public
  // process.cwd() 기반이라 배포 환경에 따라 달라질 수 있어 환경변수로 오버라이드 허용
  const publicDir =
    process.env.LOCAL_STORAGE_PUBLIC_DIR ??
    path.resolve(process.cwd(), '..', 'web', 'public');

  cachedAdapter = new LocalStorageAdapter(publicDir);
  return cachedAdapter;
}
