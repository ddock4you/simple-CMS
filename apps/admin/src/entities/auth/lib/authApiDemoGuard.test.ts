import { afterEach, describe, expect, it } from 'vitest';

import { POST as loginPost } from '../../../../app/api/auth/login/route';
import { POST as registerPost } from '../../../../app/api/auth/register/route';

const ORIGINAL_DEMO_MODE = process.env.DEMO_MODE;

describe('auth API DEMO_MODE guards', () => {
  afterEach(() => {
    process.env.DEMO_MODE = ORIGINAL_DEMO_MODE;
  });

  it('blocks direct login API calls in demo mode', async () => {
    process.env.DEMO_MODE = 'true';

    const response = await loginPost(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'admin', password: 'password' }),
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ success: false });
  });

  it('blocks direct register API calls in demo mode', async () => {
    process.env.DEMO_MODE = 'true';

    const response = await registerPost(
      new Request('http://localhost/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username: 'new_user',
          email: 'new@example.com',
          password: 'password123',
          confirmPassword: 'password123',
          name: '신규 사용자',
        }),
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ success: false });
  });
});
