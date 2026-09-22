/** Nur Pfade auf dieser Seite sind als Ziel nach dem Login erlaubt. */
export function safeNext(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith('/')) return '/';
  if (raw.startsWith('//') || raw.startsWith('/\\')) return '/';
  if (/[\r\n\\]/.test(raw)) return '/';
  return raw;
}
