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

import { createClient } from '@supabase/supabase-js';

import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

import { importSnapshotToSeed } from '../src/demo';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

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

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // upload + cleanup callback (admin SupabaseStorageAdapter와 같은 로직 inline)
  const uploadMedia = async (
    storageKey: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> => {
    if (!storageKey.startsWith('__SEED__/')) {
      throw new Error(
        `uploadMedia는 __SEED__/ 경로에만 사용 가능: ${storageKey}`,
      );
    }
    const { error } = await client.storage.from(bucket).upload(storageKey, buffer, {
      contentType: mimeType,
      upsert: true,
    });
    if (error) {
      throw new Error(`Supabase upload 실패 (${storageKey}): ${error.message}`);
    }
    const {
      data: { publicUrl },
    } = client.storage.from(bucket).getPublicUrl(storageKey);
    return publicUrl;
  };

  const cleanupStorage = async (): Promise<{
    filesDeleted: number;
    errors: string[];
  }> => {
    const errors: string[] = [];
    let filesDeleted = 0;
    const seedPrefix = '__SEED__';

    const { data: categories, error: listErr } = await client.storage
      .from(bucket)
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
      const { data: files, error: filesErr } = await client.storage
        .from(bucket)
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
        const { error: rmErr } = await client.storage
          .from(bucket)
          .remove(chunk);
        if (rmErr) {
          errors.push(`remove(${prefix}): ${rmErr.message}`);
        } else {
          filesDeleted += chunk.length;
        }
      }
    }
    return { filesDeleted, errors };
  };

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
