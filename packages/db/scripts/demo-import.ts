/**
 * 시연 모드 PR6 CLI: snapshot import (`__SEED__` 갱신).
 *
 * 사용법:
 *   pnpm demo:import <input-path>
 *   예: pnpm demo:import ./snapshot.json
 *
 * 동작:
 *   1. .env 로드 (시연 환경 — DATABASE_URL은 시연 Supabase, STORAGE_PROVIDER=supabase)
 *   2. JSON 파일 읽기
 *   3. importSnapshotToSeed:
 *      - resetSeedData (기존 __SEED__ row + Storage 파일 정리)
 *      - Phase 1: Media base64 → Supabase Storage upload
 *      - Phase 2: $transaction으로 14모델 createMany + walker remap
 *
 * **운영 DB 보호 가드**:
 *   `DEMO_MODE === 'true'`가 아니면 즉시 중단. 운영 DB에 시연 시드 적재 사고 차단.
 *
 * 부록 A의 `.env.demo`로 격리 실행 권장:
 *   `dotenv -e .env.demo -- pnpm demo:import ./snapshot.json`
 */
import path from 'node:path';
import { promises as fs } from 'node:fs';

import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { prisma } from '../src/client';
import {
  createSupabaseSeedStorageCallbacks,
  importSnapshotToSeed,
} from '../src/demo';

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error('사용법: pnpm demo:import <input-path>');
    process.exit(1);
  }

  // 운영 DB 보호 가드
  if (process.env.DEMO_MODE !== 'true') {
    console.error(
      '\n[demo-import] DEMO_MODE !== true. 시연 환경변수가 적재된 .env에서 실행하세요.\n' +
        '  운영 DB에 시드 적재 사고 차단을 위한 가드입니다.\n' +
        '  예: dotenv -e .env.demo -- pnpm demo:import <input-path>\n',
    );
    process.exit(1);
  }

  if ((process.env.STORAGE_PROVIDER ?? '').toLowerCase() !== 'supabase') {
    console.error(
      '\n[demo-import] STORAGE_PROVIDER=supabase가 아닙니다. import는 Supabase Storage 환경에서만 동작합니다.\n',
    );
    process.exit(1);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? 'uploads';
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 미설정');
    process.exit(1);
  }

  const { uploadMedia, cleanupStorage } = createSupabaseSeedStorageCallbacks({
    url: supabaseUrl,
    serviceRoleKey,
    bucket,
  });

  console.log('[demo-import] reading %s', inputPath);
  const json = await fs.readFile(inputPath, 'utf-8');
  const payload = JSON.parse(json);

  console.log('[demo-import] starting import...');
  const stats = await importSnapshotToSeed(payload, {
    uploadMedia,
    cleanupStorage,
  });

  const totalCreated = Object.values(stats.rowsCreatedByModel).reduce(
    (sum, n) => sum + n,
    0,
  );

  console.log('\n✓ 스냅샷 import 완료');
  console.log(`  rows created: ${totalCreated}`);
  console.log(`  media uploaded: ${stats.mediaFilesUploaded}`);
  console.log(`  storage files deleted: ${stats.storageFilesDeleted}`);
  console.log('\n  rows created by model:');
  for (const [model, count] of Object.entries(stats.rowsCreatedByModel)) {
    console.log(`    - ${model}: ${count}`);
  }
  if (stats.errors.length > 0) {
    console.warn(`\n⚠ 에러 ${stats.errors.length}건:`);
    for (const err of stats.errors) {
      console.warn(`  - ${err}`);
    }
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
