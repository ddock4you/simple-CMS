import path from 'node:path';
import { defineConfig } from 'prisma/config';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'npx tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
    // 시연 모드(Supabase)에서 transaction pooler URL과 분리되는 직접 연결 URL.
    // 운영 환경(.env에 DIRECT_URL 없음)에서는 DATABASE_URL로 fallback.
    directUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
  },
});
