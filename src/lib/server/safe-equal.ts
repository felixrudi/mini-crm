import { createHash, timingSafeEqual } from 'node:crypto';

/** Vergleich in konstanter Zeit. Leer oder fehlend gilt nie als gleich (fail-closed). */
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}
