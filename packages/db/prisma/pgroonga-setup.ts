import path from 'node:path';
import fs from 'node:fs';

import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const sqlPath = path.resolve(__dirname, 'pgroonga-setup.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  // 주석 제거 후 세미콜론으로 분리하여 개별 실행
  const stripped = sql
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('--'))
    .join('\n');

  const statements = stripped
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    const label = statement.split('\n')[0].trim();
    console.log(`Executing: ${label}...`);
    await prisma.$executeRawUnsafe(`${statement};`);
  }

  console.log('PGroonga setup completed.');
}

main()
  .catch((e) => {
    console.error('PGroonga setup failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
