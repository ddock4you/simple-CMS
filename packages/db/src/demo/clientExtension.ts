/**
 * 시연 모드(DEMO_MODE) Prisma extension — 세션별 데이터 격리.
 *
 * 17개 주요 모델의 모든 쿼리에 sessionId를 자동 주입하고, cross-tenant read/write를 차단한다.
 *
 * 핵심 설계:
 *   - 운영 환경의 row는 모두 sessionId='__PROD__' (schema default). 시연 환경에서 자연 격리됨
 *   - 8개 composite unique([sessionId, ...]) 덕분에 suffix 로직 불필요 — 같은 'about' slug가
 *     세션마다 1개씩 가능
 *   - `update`/`delete`는 사전 findFirst로 cross-tenant write 차단 (post-check는 too late)
 *   - `findUnique`/`findUniqueOrThrow`는 result hook에서 sessionId 검증
 *   - `upsert`는 일반 처리 회피 — siteSettings 등 helper에서 명시적 findFirst→update|create로 분리
 *   - Session 모델은 인증 인프라라 격리 대상 외(글로벌 sessionToken @unique 유지)
 *
 * 운영 환경 영향: bypass 컨텍스트는 거의 없고, 일반 호출은 sessionId='__PROD__' 자동 주입 →
 * 모든 row가 '__PROD__'이므로 기존 동작과 동일.
 */
import { Prisma } from '../generated/prisma/client';
import { getContext, isBypassed, PROD_SENTINEL } from './sessionContext';

/** Prisma client version — PrismaClientKnownRequestError 생성에 필요. */
const CLIENT_VERSION = (Prisma as { prismaVersion?: { client: string } }).prismaVersion?.client ?? '7.7.0';

/**
 * 인증 인프라 — extension 격리에서 제외.
 *   - Session: sessionToken 글로벌 unique (이미 schema에 sessionId 컬럼 미추가)
 *   - PreviewToken: token 글로벌 unique. admin이 발급 → web이 cross-origin으로 교환하는 패턴이라
 *     web에서는 sessionContext가 비어 있어(PROD_SENTINEL) 매칭 실패할 위험. exclude로 안전 처리.
 */
const EXCLUDED_MODELS = new Set(['Session', 'PreviewToken']);

/** P2025: Record not found 에러를 throw. */
function throwNotFound(operation: string): never {
  throw new Prisma.PrismaClientKnownRequestError(
    `An operation failed because it depends on one or more records that were required but not found. Operation '${operation}' on session-isolated model.`,
    { code: 'P2025', clientVersion: CLIENT_VERSION },
  );
}

/**
 * Prisma `$allModels.$allOperations`는 args가 모든 모델·작업 조합의 union이라 정적 타입으로
 * 각 분기를 narrow하기 매우 어렵다. Prisma 공식 example도 boundary에서 `any` 캐스트를 사용한다.
 * 모델 surface는 런타임에 호출자가 책임지므로(콜사이트 typecheck로 보장), 본 훅 내부에서만 한정적으로 캐스트한다.
 */
type AnyArgs = { where?: unknown; data?: unknown };

interface OperationParams {
  model: string;
  operation: string;
  args: AnyArgs;
  query: (a: unknown) => Promise<unknown>;
}

/**
 * Extension의 핵심 transform 로직. 단위 테스트가 직접 호출 가능하도록 named function으로 추출.
 * `this` context는 update/delete 분기의 `Prisma.getExtensionContext(this)`에서만 필요하다.
 */
export async function processOperation(
  this: unknown,
  rawParams: unknown,
): Promise<unknown> {
  const { model, operation, args, query } = rawParams as OperationParams;

        // bypass 컨텍스트 또는 제외 모델 → pass-through
        if (isBypassed() || EXCLUDED_MODELS.has(model)) {
          return query(args);
        }

        const ctx = getContext();
        const sessionId = ctx?.sessionId ?? PROD_SENTINEL;

        switch (operation) {
          // ─── Read 계열 — where에 sessionId AND 추가 ───────────────
          case 'findMany':
          case 'findFirst':
          case 'findFirstOrThrow':
          case 'count':
          case 'aggregate':
          case 'groupBy':
          case 'updateMany':
          case 'deleteMany': {
            return query({
              ...args,
              where: { AND: [args.where ?? {}, { sessionId }] },
            });
          }

          // ─── Create — data에 sessionId 자동 주입 ──────────────────
          case 'create': {
            const data = args.data as Record<string, unknown> | undefined;
            return query({
              ...args,
              data: { ...(data ?? {}), sessionId },
            });
          }

          case 'createMany':
          case 'createManyAndReturn': {
            const data = args.data as
              | Record<string, unknown>
              | Record<string, unknown>[]
              | undefined;
            const dataArr = Array.isArray(data) ? data : data ? [data] : [];
            return query({
              ...args,
              data: dataArr.map((d) => ({ ...d, sessionId })),
            });
          }

          // ─── findUnique — id 기반 등 글로벌 unique 통과, result hook에서 sessionId 검증 ───
          // 함정: 호출자가 select에서 sessionId를 빼면 result.sessionId === undefined가 되어
          // `undefined !== sessionId`가 항상 true → cross-tenant 아닌 row까지 null로 변함.
          // select에 sessionId가 빠져 있으면 강제 추가하고 응답에서 다시 제거한다.
          case 'findUnique':
          case 'findUniqueOrThrow': {
            const argsWithSelect = args as AnyArgs & {
              select?: Record<string, unknown>;
            };
            const select = argsWithSelect.select;
            const needsForceAdd =
              select && typeof select === 'object' && !('sessionId' in select);
            const augmentedArgs = needsForceAdd
              ? {
                  ...argsWithSelect,
                  select: { ...select, sessionId: true },
                }
              : argsWithSelect;
            const result = await query(augmentedArgs);
            if (
              result &&
              (result as { sessionId?: string }).sessionId !== sessionId
            ) {
              if (operation === 'findUniqueOrThrow') throwNotFound(operation);
              return null;
            }
            if (needsForceAdd && result) {
              const { sessionId: _injected, ...rest } = result as Record<
                string,
                unknown
              >;
              return rest;
            }
            return result;
          }

          // ─── update/delete — where에 sessionId를 직접 추가 (cross-tenant write 차단) ────────
          // Prisma 5+의 WhereUniqueInput은 unique field(id 등)와 non-unique field(sessionId)를
          // 함께 받을 수 있다. 사전 findFirst에 의존하면 Vercel 번들 환경에서 extension context
          // delegate가 undefined가 되는 회귀가 있어, 단일 update/delete query에 tenant guard를 합친다.
          case 'update':
          case 'delete': {
            const where = args.where as Record<string, unknown> | undefined;
            return query({
              ...args,
              where: { ...(where ?? {}), sessionId },
            });
          }

          // ─── upsert — extension 일반 처리 회피 ─────────────────
          // upsert는 단일 쿼리 안에 SELECT/UPDATE/INSERT가 묶여 있어 cross-tenant 안전 처리가 어렵다.
          // siteSettings 등 helper 코드에서 findFirst → update | create 명시 분기로 대체했다.
          // 신규 도입 시에도 같은 패턴을 따르도록 경고 출력 후 통과.
          case 'upsert': {
            console.warn(
              `[demo-extension] upsert on ${model} — consider explicit findFirst → update | create branching for cross-tenant safety`,
            );
            return query(args);
          }

          default:
            return query(args);
        }
}

export const demoExtension = Prisma.defineExtension({
  name: 'demo-session-isolation',
  query: {
    $allModels: {
      async $allOperations(params) {
        return processOperation.call(this, params);
      },
    },
  },
});
