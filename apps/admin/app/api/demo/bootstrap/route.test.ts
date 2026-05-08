/**
 * Demo bootstrap API route 단위 테스트.
 *
 * 통합 smoke(실제 DB의 __SEED__ 클론 + Set-Cookie 검증)는 DEMO_TEST_DB_URL 환경 변수
 * 게이트로 별도 테스트 DB 필요. PR4 1차에서는 DEMO_MODE 가드(404 분기)만 단위로 커버.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { POST } from './route';

const ORIGINAL_DEMO_MODE = process.env.DEMO_MODE;

describe('POST /api/demo/bootstrap (DEMO_MODE 가드)', () => {
  afterEach(() => {
    process.env.DEMO_MODE = ORIGINAL_DEMO_MODE;
    vi.restoreAllMocks();
  });

  it('returns 404 when DEMO_MODE is not "true"', async () => {
    process.env.DEMO_MODE = undefined;

    const request = new Request('http://localhost/_cms/admin/api/demo/bootstrap', {
      method: 'POST',
    });
    const response = await POST(request);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  it('returns 404 when DEMO_MODE is "false"', async () => {
    process.env.DEMO_MODE = 'false';

    const request = new Request('http://localhost/_cms/admin/api/demo/bootstrap', {
      method: 'POST',
    });
    const response = await POST(request);

    expect(response.status).toBe(404);
  });
});
