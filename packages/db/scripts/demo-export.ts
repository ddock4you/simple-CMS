/**
 * 시연 모드 PR6 CLI: snapshot export.
 *
 * 사용법:
 *   pnpm demo:export <output-path>
 *   예: pnpm demo:export ./snapshot.json
 *
 * 동작:
 *   1. .env 로드 (DATABASE_URL + STORAGE_PROVIDER + SUPABASE_*)
 *   2. provider별 Media downloader 구성
 *   3. exportSnapshot — 14모델 findMany + Media base64 + walker
 *   4. JSON 파일로 fs.writeFile
 *
 * 운영자가 dev 환경에서 콘텐츠 작성 후 export → 시연 환경에서 import 흐름.
 *
 * 주의:
 *   - sourceSessionId는 __PROD__ 고정 (시연 환경에서 export하려면 코드 수정 필요 — 일반적으로 dev/운영에서 export)
 *   - sharp 1600px 리사이즈는 admin route와 동일 패턴 (CLI도 sharp 사용 — db 의존성)
 */
import path from 'node:path';
import { promises as fs } from 'node:fs';

import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { prisma } from '../src/client';
import {
  exportSnapshot,
  createLocalMediaDownloader,
  createSupabaseMediaDownloader,
  extractStorageKeyFromUrl,
} from '../src/demo';

async function main() {
  const outputPath = process.argv[2];
  if (!outputPath) {
    console.error('사용법: pnpm demo:export <output-path>');
    process.exit(1);
  }

  const provider = (process.env.STORAGE_PROVIDER ?? 'local').toLowerCase();

  let downloadMedia: (key: string) => Promise<Buffer>;
  let urlToKey: (url: string) => string | null;

  if (provider === 'supabase') {
    const url = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'uploads';
    if (!url || !serviceRoleKey) {
      console.error(
        'STORAGE_PROVIDER=supabase이지만 SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY 미설정',
      );
      process.exit(1);
    }
    const { createClient } = await import('@supabase/supabase-js');
    const client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false },
    });
    downloadMedia = createSupabaseMediaDownloader(client.storage.from(bucket));
    urlToKey = (u) => extractStorageKeyFromUrl(u, 'supabase', bucket);
  } else {
    const publicDir =
      process.env.LOCAL_STORAGE_PUBLIC_DIR ??
      path.resolve(__dirname, '..', '..', '..', 'apps', 'web', 'public');
    downloadMedia = createLocalMediaDownloader(publicDir);
    urlToKey = (u) => extractStorageKeyFromUrl(u, 'local');
  }

  console.log('[demo-export] provider=%s', provider);
  console.log('[demo-export] sourceSessionId=__PROD__');

  // CLI도 packages/db singleton prisma를 사용한다. exportSnapshot은 내부에서
  // runWithBypass로 extension 필터를 우회하고 sourceSessionId WHERE를 명시한다.
  const payload = await exportSnapshot({
    sourceSessionId: '__PROD__',
    downloadMedia,
    urlToStorageKey: urlToKey,
  });

  const json = JSON.stringify(payload, null, 2);
  await fs.writeFile(outputPath, json, 'utf-8');

  const totalRows = Object.values(payload.models).reduce(
    (sum, arr) => sum + arr.length,
    0,
  );
  const sizeMb = (json.length / 1024 / 1024).toFixed(2);

  console.log(
    `✓ 스냅샷 저장 완료: ${outputPath} (${totalRows} row, ${sizeMb} MB)`,
  );
  for (const [model, rows] of Object.entries(payload.models)) {
    console.log(`  - ${model}: ${rows.length}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
