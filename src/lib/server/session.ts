import { createHmac, timingSafeEqual } from 'node:crypto';

function sign(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createSessionToken(secret: string, now: number, ttlMs: number): string {
  const exp = String(now + ttlMs);
  return `${exp}.${sign(secret, exp)}`;
}

export function verifySessionToken(secret: string, token: string, now: number): boolean {
  const i = token.indexOf('.');
  if (i < 1) return false;
  const exp = token.slice(0, i);
  const sig = token.slice(i + 1);
  if (!/^\d+$/.test(exp) || Number(exp) <= now) return false;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(secret, exp));
  return a.length === b.length && timingSafeEqual(a, b);
}
