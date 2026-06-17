import { expect, test, type BrowserContext } from '@playwright/test';

const SESSION_COOKIE_NAME = 'session-token';

async function getSessionCookieValue(context: BrowserContext) {
  const cookies = await context.cookies();
  return cookies.find((cookie) => cookie.name === SESSION_COOKIE_NAME)?.value;
}

test.describe('demo smoke', () => {
  test('bootstraps an isolated session, edits via admin, and resets', async ({
    context,
    page,
  }) => {
    const title = `Demo smoke ${Date.now()}`;

    await page.goto('/');
    await expect(page.getByTestId('demo-banner')).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByText('간략 소개').first()).toBeVisible();

    const initialSessionToken = await getSessionCookieValue(context);
    expect(initialSessionToken).toBeTruthy();

    await page.goto('/p/about');
    await expect(
      page.getByRole('heading', { level: 1, name: '소개' }),
    ).toBeVisible();
    await expect(
      page.getByText('시연용 서브페이지입니다.').first(),
    ).toBeVisible();

    await page.goto('/_cms/admin/dashboard');
    await expect(page.getByTestId('demo-banner')).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 1, name: '대시보드' }),
    ).toBeVisible();

    const createResponse = await page.request.post('/_cms/admin/api/subpages', {
      data: {
        title,
        status: 'PUBLISHED',
        cclType: null,
        cclAi: false,
        feedbackEnabled: false,
      },
    });
    expect(createResponse.ok()).toBeTruthy();

    const listResponse = await page.request.get(
      `/_cms/admin/api/subpages?q=${encodeURIComponent(title)}`,
    );
    expect(listResponse.ok()).toBeTruthy();
    const listBody = (await listResponse.json()) as {
      data?: { items?: Array<{ title: string; slug: string }> };
    };
    const created = listBody.data?.items?.find((item) => item.title === title);
    expect(created?.slug).toBeTruthy();

    await page.goto(`/p/${created!.slug}`);
    await expect(
      page.getByRole('heading', { level: 1, name: title }),
    ).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: '새 세션 시작' }).click();
    await expect
      .poll(() => getSessionCookieValue(context), { timeout: 30_000 })
      .not.toBe(initialSessionToken);
    await expect(page.getByText('간략 소개').first()).toBeVisible({
      timeout: 30_000,
    });

    const resetSessionToken = await getSessionCookieValue(context);
    expect(resetSessionToken).toBeTruthy();

    await page.goto(`/p/${created!.slug}`);
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: '페이지를 찾을 수 없습니다',
      }),
    ).toBeVisible();

    await page.goto('/p/about');
    await expect(
      page.getByRole('heading', { level: 1, name: '소개' }),
    ).toBeVisible();
  });
});
