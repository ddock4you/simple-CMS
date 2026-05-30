import { PrismaClient } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { demoExtension } from './demo/clientExtension';
import type { Prisma } from './generated/prisma/client';

// DEMO_MODE에서만 extension을 적용. 운영 환경은 base 그대로 사용 (extension overhead 0).
// sentinel sessionId='__PROD__'는 schema의 default라 모든 환경 데이터에 자동 적용됨.
//
// 타입 노출 정책: 호출 측에는 base PrismaClient 타입을 노출한다. $extends는 query hook만 추가하고
// 모델 surface(prisma.subpage.findFirst 등)는 동일하므로 base 타입으로도 모든 호출이 정상 동작한다.
// 이렇게 해야 PrismaClient 타입이 호출 측에 일관되게 보이고, 콜사이트가 base/extended를 구분할 필요가 없어진다.

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const adapter = new PrismaPg({ connectionString });
  const logLevels: Prisma.LogLevel[] =
    process.env.NODE_ENV === 'development'
      ? process.env.PRISMA_QUERY_LOG === 'true'
        ? ['query', 'error', 'warn']
        : ['error', 'warn']
      : ['error'];

  const base = new PrismaClient({
    adapter,
    log: logLevels,
  });

  if (process.env.DEMO_MODE === 'true') {
    return base.$extends(demoExtension) as unknown as PrismaClient;
  }
  return base;
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
