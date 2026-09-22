/** Einfache Bremse im Arbeitsspeicher: höchstens `max` Versuche je Schlüssel im Zeitfenster. */
export function createLimiter(max: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return {
    allow(key: string, now: number): boolean {
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      if (recent.length >= max) {
        hits.set(key, recent);
        return false;
      }
      recent.push(now);
      hits.set(key, recent);
      return true;
    }
  };
}
