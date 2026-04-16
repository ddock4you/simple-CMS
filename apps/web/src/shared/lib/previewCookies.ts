import type { NextResponse } from 'next/server';

export const PREVIEW_COOKIE_NAME = 'preview_session';
const MAX_AGE_SECONDS = 600;

export function setPreviewCookie(
  response: NextResponse,
  token: string,
): void {
  response.cookies.set({
    name: PREVIEW_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearPreviewCookie(response: NextResponse): void {
  response.cookies.delete(PREVIEW_COOKIE_NAME);
}
