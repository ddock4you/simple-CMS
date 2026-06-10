/**
 * 메인 페이지 저사용 섹션 제거용 one-off 정리 스크립트.
 *
 * 제거 대상:
 * - RECOMMENDED
 * - SUB_CAROUSEL
 * - SHORTCUT
 * - LATEST_POSTS
 * - CTA
 *
 * 모든 sessionId에서 대상 HomeSection row를 삭제하고, 남은 고정 5개 섹션의
 * displayOrder를 정규화한다. raw SQL 문자열 기반이라 Prisma enum 축소 전후
 * 모두 멱등 실행 가능하다.
 */
import path from 'node:path';

import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const REMOVED_TYPES = [
  'RECOMMENDED',
  'SUB_CAROUSEL',
  'SHORTCUT',
  'LATEST_POSTS',
  'CTA',
] as const;

const KEPT_ORDER = [
  'HERO',
  'BRIEF_INTRO',
  'FREQUENT_MENU',
  'GALLERY_COLLECTION',
  'NOTICE',
] as const;

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const removedTypesSql = REMOVED_TYPES.map((type) => `'${type}'`).join(', ');
  const removed = await prisma.$executeRawUnsafe(`
    DELETE FROM "HomeSection"
    WHERE "sectionType"::text IN (${removedTypesSql})
  `);

  for (const [displayOrder, sectionType] of KEPT_ORDER.entries()) {
    await prisma.$executeRaw`
      UPDATE "HomeSection"
      SET "displayOrder" = ${displayOrder}
      WHERE "sectionType"::text = ${sectionType}
    `;
  }

  console.log(`Removed HomeSection rows: ${removed}`);
  console.log('Normalized remaining HomeSection displayOrder values.');
}

main()
  .catch((error) => {
    console.error('Failed to prune removed HomeSections:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
