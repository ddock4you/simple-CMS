import { createHash } from 'node:crypto';

export function extractIp(request: Request): string | null {
  const forwarded = request.headers
    .get('x-forwarded-for')
    ?.split(',')[0]
    ?.trim();
  if (forwarded) return forwarded;
  const real = request.headers.get('x-real-ip')?.trim();
  if (real) return real;
  return null;
}

export function hashIp(ip: string): string {
  const salt = process.env.FEEDBACK_IP_SALT;
  if (!salt) {
    console.warn(
      '[Feedback API] FEEDBACK_IP_SALT is not set — using fallback (not safe for production).',
    );
  }
  return createHash('sha256')
    .update(`${ip}|${salt ?? 'change-me'}`)
    .digest('hex');
}
