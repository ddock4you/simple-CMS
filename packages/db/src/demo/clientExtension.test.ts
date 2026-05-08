/**
 * demoExtension transform 단위 테스트.
 *
 * `processOperation` named export를 직접 호출해 args 변환·sessionId 주입·post-filter 동작을
 * mock query로 검증한다. DB 연결은 필요 없음 (vitest dummy DATABASE_URL 환경에서도 그린).
 *
 * 통합 시나리오(실제 격리 검증)는 PR4(Step 4 seed) 구현 후 DEMO_TEST_DB_URL 환경에서 추가.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { demoExtension, processOperation } from './clientExtension';
import { runWith, runWithBypass, PROD_SENTINEL } from './sessionContext';

function callOp(params: {
  model: string;
  operation: string;
  args: unknown;
  query: ReturnType<typeof vi.fn>;
  thisArg?: unknown;
}) {
  return processOperation.call(params.thisArg ?? {}, {
    model: params.model,
    operation: params.operation,
    args: params.args,
    query: params.query,
  });
}

describe('demoExtension export', () => {
  it('Prisma extension 객체로 생성 가능 (smoke)', () => {
    expect(demoExtension).toBeDefined();
  });
});

describe('processOperation — 컨텍스트 외 호출 (PROD_SENTINEL)', () => {
  it('findMany — where에 PROD_SENTINEL AND 추가', async () => {
    const query = vi.fn().mockResolvedValue([]);
    await callOp({
      model: 'Subpage',
      operation: 'findMany',
      args: { where: { status: 'PUBLISHED' } },
      query,
    });
    expect(query).toHaveBeenCalledWith({
      where: { AND: [{ status: 'PUBLISHED' }, { sessionId: PROD_SENTINEL }] },
    });
  });

  it('create — data에 PROD_SENTINEL 주입', async () => {
    const query = vi.fn().mockResolvedValue({ id: '1' });
    await callOp({
      model: 'Subpage',
      operation: 'create',
      args: { data: { title: 't', slug: 's' } },
      query,
    });
    expect(query).toHaveBeenCalledWith({
      data: { title: 't', slug: 's', sessionId: PROD_SENTINEL },
    });
  });
});

describe('processOperation — bypass 컨텍스트', () => {
  it('findMany — args 변경 없이 통과', async () => {
    const query = vi.fn().mockResolvedValue([]);
    await runWithBypass(() =>
      callOp({
        model: 'Subpage',
        operation: 'findMany',
        args: { where: { status: 'PUBLISHED' } },
        query,
      }),
    );
    expect(query).toHaveBeenCalledWith({ where: { status: 'PUBLISHED' } });
  });

  it('create — sessionId 주입 없이 통과', async () => {
    const query = vi.fn().mockResolvedValue({ id: '1' });
    await runWithBypass(() =>
      callOp({
        model: 'Subpage',
        operation: 'create',
        args: { data: { title: 't', slug: 's' } },
        query,
      }),
    );
    expect(query).toHaveBeenCalledWith({ data: { title: 't', slug: 's' } });
  });

  it('Session/PreviewToken 모델 — bypass 외에서도 항상 통과', async () => {
    const query = vi.fn().mockResolvedValue(null);
    await runWith({ sessionId: 'A' }, async () => {
      await callOp({
        model: 'Session',
        operation: 'findUnique',
        args: { where: { sessionToken: 'tok-1' } },
        query,
      });
      await callOp({
        model: 'PreviewToken',
        operation: 'findUnique',
        args: { where: { token: 'pre-1' } },
        query,
      });
    });
    // 둘 다 args 그대로 query에 전달됨
    expect(query).toHaveBeenNthCalledWith(1, { where: { sessionToken: 'tok-1' } });
    expect(query).toHaveBeenNthCalledWith(2, { where: { token: 'pre-1' } });
  });
});

describe('processOperation — runWith({sessionId: A})', () => {
  it('findMany — where에 A AND 추가', async () => {
    const query = vi.fn().mockResolvedValue([]);
    await runWith({ sessionId: 'A' }, () =>
      callOp({
        model: 'Subpage',
        operation: 'findMany',
        args: { where: { status: 'PUBLISHED' } },
        query,
      }),
    );
    expect(query).toHaveBeenCalledWith({
      where: { AND: [{ status: 'PUBLISHED' }, { sessionId: 'A' }] },
    });
  });

  it('findMany — args.where 없을 때도 sessionId 주입', async () => {
    const query = vi.fn().mockResolvedValue([]);
    await runWith({ sessionId: 'A' }, () =>
      callOp({
        model: 'Subpage',
        operation: 'findMany',
        args: {},
        query,
      }),
    );
    expect(query).toHaveBeenCalledWith({
      where: { AND: [{}, { sessionId: 'A' }] },
    });
  });

  it('create — data에 A 주입', async () => {
    const query = vi.fn().mockResolvedValue({ id: '1' });
    await runWith({ sessionId: 'A' }, () =>
      callOp({
        model: 'Subpage',
        operation: 'create',
        args: { data: { title: 't', slug: 's' } },
        query,
      }),
    );
    expect(query).toHaveBeenCalledWith({
      data: { title: 't', slug: 's', sessionId: 'A' },
    });
  });

  it('createMany — data 배열 각 element에 A 주입', async () => {
    const query = vi.fn().mockResolvedValue({ count: 2 });
    await runWith({ sessionId: 'A' }, () =>
      callOp({
        model: 'Subpage',
        operation: 'createMany',
        args: { data: [{ title: 't1', slug: 's1' }, { title: 't2', slug: 's2' }] },
        query,
      }),
    );
    expect(query).toHaveBeenCalledWith({
      data: [
        { title: 't1', slug: 's1', sessionId: 'A' },
        { title: 't2', slug: 's2', sessionId: 'A' },
      ],
    });
  });

  it('updateMany — where에 A AND 추가', async () => {
    const query = vi.fn().mockResolvedValue({ count: 0 });
    await runWith({ sessionId: 'A' }, () =>
      callOp({
        model: 'Subpage',
        operation: 'updateMany',
        args: { where: { status: 'DRAFT' }, data: { status: 'PUBLISHED' } },
        query,
      }),
    );
    expect(query).toHaveBeenCalledWith({
      where: { AND: [{ status: 'DRAFT' }, { sessionId: 'A' }] },
      data: { status: 'PUBLISHED' },
    });
  });
});

describe('processOperation — findUnique post-filter', () => {
  it('result.sessionId가 현재와 일치 → row 반환', async () => {
    const query = vi.fn().mockResolvedValue({ id: '1', sessionId: 'A', title: 't' });
    const result = await runWith({ sessionId: 'A' }, () =>
      callOp({
        model: 'Subpage',
        operation: 'findUnique',
        args: { where: { id: '1' } },
        query,
      }),
    );
    expect(result).toEqual({ id: '1', sessionId: 'A', title: 't' });
  });

  it('result.sessionId 불일치 → null 반환 (cross-tenant 차단)', async () => {
    const query = vi.fn().mockResolvedValue({ id: '1', sessionId: 'A', title: 't' });
    const result = await runWith({ sessionId: 'B' }, () =>
      callOp({
        model: 'Subpage',
        operation: 'findUnique',
        args: { where: { id: '1' } },
        query,
      }),
    );
    expect(result).toBeNull();
  });

  it('findUniqueOrThrow + 불일치 → P2025 throw', async () => {
    const query = vi.fn().mockResolvedValue({ id: '1', sessionId: 'A' });
    await expect(
      runWith({ sessionId: 'B' }, () =>
        callOp({
          model: 'Subpage',
          operation: 'findUniqueOrThrow',
          args: { where: { id: '1' } },
          query,
        }),
      ),
    ).rejects.toMatchObject({ code: 'P2025' });
  });

  // ★ advisor가 잡은 select 빠진 사용처 회귀 방지
  it('select가 sessionId 빠뜨려도 정상 동작 (sessionId 강제 주입 후 응답에서 제거)', async () => {
    const query = vi.fn().mockImplementation(async (passedArgs) => {
      // 강제 주입된 select에 sessionId가 포함되어 있는지 확인
      expect(passedArgs).toMatchObject({
        select: { id: true, title: true, sessionId: true },
      });
      // DB 응답에 sessionId 포함
      return { id: '1', title: 't', sessionId: 'A' };
    });

    const result = await runWith({ sessionId: 'A' }, () =>
      callOp({
        model: 'Subpage',
        operation: 'findUnique',
        args: { where: { id: '1' }, select: { id: true, title: true } },
        query,
      }),
    );

    // sessionId가 응답에서 제거되어 호출자가 기대한 select 형태 그대로
    expect(result).toEqual({ id: '1', title: 't' });
    expect((result as Record<string, unknown>).sessionId).toBeUndefined();
  });

  it('select가 이미 sessionId 포함 → 강제 주입 없음, 응답 그대로', async () => {
    const query = vi.fn().mockResolvedValue({ id: '1', sessionId: 'A' });
    const result = await runWith({ sessionId: 'A' }, () =>
      callOp({
        model: 'Subpage',
        operation: 'findUnique',
        args: { where: { id: '1' }, select: { id: true, sessionId: true } },
        query,
      }),
    );
    // query에 전달된 args.select가 변하지 않았는지
    expect(query).toHaveBeenCalledWith({
      where: { id: '1' },
      select: { id: true, sessionId: true },
    });
    // 응답에 sessionId 그대로 포함
    expect(result).toEqual({ id: '1', sessionId: 'A' });
  });

  it('result null (없음) → null 그대로', async () => {
    const query = vi.fn().mockResolvedValue(null);
    const result = await runWith({ sessionId: 'A' }, () =>
      callOp({
        model: 'Subpage',
        operation: 'findUnique',
        args: { where: { id: 'nonexistent' } },
        query,
      }),
    );
    expect(result).toBeNull();
  });
});

describe('processOperation — upsert pass-through 경고', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('upsert 호출 시 console.warn + args 그대로 통과', async () => {
    const query = vi.fn().mockResolvedValue({ id: '1' });
    await runWith({ sessionId: 'A' }, () =>
      callOp({
        model: 'SiteSettings',
        operation: 'upsert',
        args: {
          where: { key: 'X' },
          create: { key: 'X', value: 'v' },
          update: { value: 'v' },
        },
        query,
      }),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('upsert on SiteSettings'),
    );
    expect(query).toHaveBeenCalledWith({
      where: { key: 'X' },
      create: { key: 'X', value: 'v' },
      update: { value: 'v' },
    });
    warnSpy.mockRestore();
  });
});

// ─── 통합 smoke (DEMO_TEST_DB_URL 환경 변수 있을 때만) ─────────────────
const hasDemoTestDb = Boolean(process.env.DEMO_TEST_DB_URL);

describe.skipIf(!hasDemoTestDb)('demoExtension integration (DEMO_TEST_DB_URL 필요)', () => {
  it('TODO: PR4(Step 4 seed) 구현 시 통합 검증 추가', () => {
    // 시연 진입(seed 복제)이 PR4에서 구현된 뒤 다음 시나리오를 추가:
    //  - runWith({sessionId: 'TEST_A'}, () => prisma.subpage.create({data: {title, slug}}))
    //  - runWith({sessionId: 'TEST_B'}, () => prisma.subpage.findMany()) → 빈 배열
    //  - cross-tenant update → P2025
    //  - 같은 slug 동시 존재 가능 / 같은 세션 중복 → P2002
    //  - 정리: deleteMany({where: {sessionId: {in: ['TEST_A','TEST_B']}}})
    expect(true).toBe(true);
  });
});
