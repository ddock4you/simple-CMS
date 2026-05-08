import { describe, it, expect } from 'vitest';

import {
  enterWith,
  runWith,
  runWithBypass,
  getContext,
  getCurrentSessionId,
  isBypassed,
  PROD_SENTINEL,
  SEED_SENTINEL,
} from './sessionContext';

describe('sessionContext', () => {
  it('컨텍스트 미진입 → getContext() = undefined', () => {
    expect(getContext()).toBeUndefined();
  });

  it('컨텍스트 미진입 → getCurrentSessionId() = __PROD__ sentinel', () => {
    expect(getCurrentSessionId()).toBe(PROD_SENTINEL);
  });

  it('컨텍스트 미진입 → isBypassed() = false', () => {
    expect(isBypassed()).toBe(false);
  });

  it('runWith({sessionId: A}) 안에서만 sessionId=A 적용', async () => {
    let inside: string | undefined;
    await runWith({ sessionId: 'A' }, async () => {
      inside = getCurrentSessionId();
    });
    expect(inside).toBe('A');
    // runWith 종료 후 다시 sentinel
    expect(getCurrentSessionId()).toBe(PROD_SENTINEL);
  });

  it('runWith — getContext()로 객체 그대로 회수', async () => {
    const captured = { ctx: undefined as ReturnType<typeof getContext> };
    await runWith({ sessionId: 'demo-123', bypass: false }, async () => {
      captured.ctx = getContext();
    });
    expect(captured.ctx).toEqual({ sessionId: 'demo-123', bypass: false });
  });

  it('runWithBypass → isBypassed() = true + sessionId 진입', async () => {
    await runWithBypass(async () => {
      expect(isBypassed()).toBe(true);
      // bypass marker는 외부에서 직접 사용하지 말고 isBypassed() 사용
      expect(getCurrentSessionId()).not.toBe(PROD_SENTINEL);
    });
    expect(isBypassed()).toBe(false);
  });

  it('runWith 안에서 비동기 호출 chain — 상속 유지', async () => {
    const collected: string[] = [];
    await runWith({ sessionId: 'X' }, async () => {
      collected.push(getCurrentSessionId());
      await new Promise((r) => setTimeout(r, 0));
      collected.push(getCurrentSessionId());
      // 중첩 await chain
      await Promise.all([
        Promise.resolve().then(() => collected.push(getCurrentSessionId())),
        new Promise((r) => setTimeout(r, 1)).then(() =>
          collected.push(getCurrentSessionId()),
        ),
      ]);
    });
    expect(collected).toEqual(['X', 'X', 'X', 'X']);
  });

  it('중첩 runWith — 안쪽 sessionId가 바깥 덮어씀', async () => {
    let inner: string | undefined;
    let afterInner: string | undefined;
    await runWith({ sessionId: 'OUTER' }, async () => {
      await runWith({ sessionId: 'INNER' }, async () => {
        inner = getCurrentSessionId();
      });
      afterInner = getCurrentSessionId();
    });
    expect(inner).toBe('INNER');
    expect(afterInner).toBe('OUTER');
  });

  it('runWithBypass 안에서 runWith로 specific sessionId 활성화 가능', async () => {
    await runWithBypass(async () => {
      expect(isBypassed()).toBe(true);
      await runWith({ sessionId: 'NESTED' }, async () => {
        expect(isBypassed()).toBe(false);
        expect(getCurrentSessionId()).toBe('NESTED');
      });
      // bypass 컨텍스트로 복귀
      expect(isBypassed()).toBe(true);
    });
  });

  it('enterWith — 같은 async tree에서 sessionId 활성화', async () => {
    await new Promise<void>((resolve) => {
      // 격리된 async 스코프에서 enterWith 사용 (다른 테스트 오염 방지)
      Promise.resolve().then(() => {
        enterWith({ sessionId: 'ENTERED' });
        expect(getCurrentSessionId()).toBe('ENTERED');
        resolve();
      });
    });
    // 격리 스코프 종료 후 — 다른 async tree이므로 영향 없음
    expect(getCurrentSessionId()).toBe(PROD_SENTINEL);
  });

  it('PROD_SENTINEL과 SEED_SENTINEL이 정확한 값', () => {
    expect(PROD_SENTINEL).toBe('__PROD__');
    expect(SEED_SENTINEL).toBe('__SEED__');
  });
});
