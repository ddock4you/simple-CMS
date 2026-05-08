/**
 * 시연 모드 도입(Step 3 — composite unique + sentinel) 일회성 백필.
 * 기존 NULL sessionId를 '__PROD__' sentinel로 채워 NOT NULL + composite unique 제약 적용을 가능하게 한다.
 *
 * 실행: `pnpm tsx packages/db/prisma/backfill-session-id.ts`
 *  ↓
 * `pnpm db:push` (NOT NULL + composite unique 적용)
 *
 * 멱등 — 재실행해도 안전 (UPDATE ... WHERE sessionId IS NULL은 0건이 됨).
 */
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const TABLES = [
  'User',
  'Role',
  'Subpage',
  'SubpageFeedback',
  'SubpageVersion',
  'Board',
  'Post',
  'Media',
  'HomeSection',
  'HomePopup',
  'PageBlock',
  'NavigationMenu',
  'NavigationMenuItem',
  'AuditLog',
  'SiteSettings',
  'PreviewToken',
  'ErrorLog',
];

const SENTINEL = '__PROD__';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log(`Backfilling sessionId='${SENTINEL}' across ${TABLES.length} tables...\n`);

  let totalUpdated = 0;

  for (const table of TABLES) {
    const sql = `UPDATE "${table}" SET "sessionId" = $1 WHERE "sessionId" IS NULL`;
    const updated = await prisma.$executeRawUnsafe(sql, SENTINEL);
    console.log(`  ${table}: ${updated} row(s) updated`);
    totalUpdated += updated;
  }

  console.log(`\n✓ Total ${totalUpdated} row(s) backfilled. Now run: pnpm db:push`);
}

main()
  .catch((e) => {
    console.error('Backfill failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
