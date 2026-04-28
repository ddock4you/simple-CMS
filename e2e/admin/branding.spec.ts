import { test, expect, type APIRequestContext } from '@playwright/test';

const ADMIN_URL = 'http://localhost:3001';

async function loginAsAdmin(request: APIRequestContext) {
  const res = await request.post(`${ADMIN_URL}/api/auth/login`, {
    data: {
      username:
        process.env.E2E_ADMIN_USERNAME ??
        process.env.INITIAL_ADMIN_USERNAME ??
        'admin',
      password:
        process.env.E2E_ADMIN_PASSWORD ??
        process.env.INITIAL_ADMIN_PASSWORD ??
        'tmdgus123!',
    },
  });
  if (!res.ok())
    throw new Error(`Admin login failed: ${res.status()}`);
}

test.describe('브랜딩 업로드 MIME 화이트리스트', () => {
  test.beforeEach(async ({ request }) => {
    await loginAsAdmin(request);
  });

  test('SVG 업로드 → 400 차단', async ({ request }) => {
    const svgBuffer = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>',
    );
    const res = await request.post(`${ADMIN_URL}/api/media/branding-upload`, {
      multipart: {
        file: {
          name: 'test-brand.svg',
          mimeType: 'image/svg+xml',
          buffer: svgBuffer,
        },
      },
    });
    expect(res.status()).toBe(400);
  });

  test('PNG 업로드 → 성공 후 정리', async ({ request }) => {
    // 최소 1×1 투명 PNG
    const pngBase64 =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==';
    const pngBuffer = Buffer.from(pngBase64, 'base64');
    const res = await request.post(`${ADMIN_URL}/api/media/branding-upload`, {
      multipart: {
        file: {
          name: 'test-brand.png',
          mimeType: 'image/png',
          buffer: pngBuffer,
        },
      },
    });
    expect([200, 201]).toContain(res.status());

    const body = await res.json();
    // 재사용(reused=true)이면 기존 Media를 참조하므로 삭제 skip
    if (body.data?.id && !body.data.reused) {
      await request.delete(`${ADMIN_URL}/api/media/${body.data.id}`);
    }
  });
});
