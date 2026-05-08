/**
 * 시연 모드(DEMO_MODE) 세션 컨텍스트.
 *
 * AsyncLocalStorage 기반으로 한 요청(또는 콜백 스코프)에 sessionId를 묶고,
 * Prisma extension(`clientExtension.ts`)이 모든 쿼리에 자동 주입한다.
 *
 * - 운영 환경(컨텍스트 없음) → sentinel '__PROD__' fallback
 * - 시연 환경 진입 시 layout/middleware에서 `enterWith({ sessionId })` 호출
 * - 인증·시드처럼 격리 외 동작이 필요한 경로는 `runWithBypass`로 감싸기
 */
import { AsyncLocalStorage } from 'node:async_hooks';

export interface DemoContext {
  /** 시연 세션 식별자 또는 sentinel ('__PROD__' / '__SEED__' / '__BYPASS__'). */
  sessionId: string;
  /** true면 extension이 sessionId 주입/검증을 모두 skip. 인증 부트스트랩·시드용. */
  bypass?: boolean;
}

/** 운영 환경 row의 sessionId sentinel. schema의 default("__PROD__")와 일치해야 한다. */
export const PROD_SENTINEL = '__PROD__';
/** 시연 모드의 seed row sessionId. Step 4 seed가 INSERT...SELECT 복제 원본으로 사용. */
export const SEED_SENTINEL = '__SEED__';
/** runWithBypass 내부에서만 사용되는 마커. 일반 쿼리 매칭에 쓰지 말 것. */
const BYPASS_MARKER = '__BYPASS__';

const storage = new AsyncLocalStorage<DemoContext>();

/**
 * 현재 async 컨텍스트에 DemoContext를 즉시 부착한다.
 * Next.js layout처럼 "이 시점 이후 모든 await에 적용"하고 싶을 때 사용.
 *
 * 주의: enterWith는 store를 새로 만들지 않고 현재 스토어에 set한다.
 * 같은 async 트리에서 호출되면 이전 컨텍스트를 덮어쓰므로 layout 진입부에서만 사용.
 */
export function enterWith(context: DemoContext): void {
  storage.enterWith(context);
}

/**
 * 명시적인 콜백 스코프 안에서만 컨텍스트를 활성화한다.
 * cron/스크립트/특수 경로처럼 진입과 종료가 분명한 곳에서 권장.
 */
export function runWith<T>(
  context: DemoContext,
  fn: () => Promise<T>,
): Promise<T> {
  return storage.run(context, fn);
}

/**
 * extension의 sessionId 주입을 skip하고 모든 row를 보이게 한다.
 * 사용처:
 *   - 인증 부트스트랩 (Session/User/Role join이 sessionId에 묶이지 않음)
 *   - Step 4 seed의 __SEED__ 복제 트랜잭션
 *   - cron cleanup의 만료 세션 일괄 정리
 */
export function runWithBypass<T>(fn: () => Promise<T>): Promise<T> {
  return storage.run({ sessionId: BYPASS_MARKER, bypass: true }, fn);
}

/** 현재 컨텍스트(없으면 undefined)를 반환. */
export function getContext(): DemoContext | undefined {
  return storage.getStore();
}

/**
 * 현재 sessionId를 반환. 컨텍스트 미진입 시 운영 sentinel('__PROD__') fallback.
 * raw SQL ($queryRaw)에서 sessionId WHERE 절을 만들 때 사용.
 */
export function getCurrentSessionId(): string {
  return storage.getStore()?.sessionId ?? PROD_SENTINEL;
}

/** runWithBypass 진입 여부. extension이 자체 분기에 사용. */
export function isBypassed(): boolean {
  return storage.getStore()?.bypass === true;
}
