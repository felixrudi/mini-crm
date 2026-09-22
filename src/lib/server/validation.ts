export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif'];

const RECORD_ID = /^rec[A-Za-z0-9]{10,20}$/;

export function isRecordId(v: unknown): v is string {
  return typeof v === 'string' && RECORD_ID.test(v);
}

export function checkUpload(
  file: { size: number; type: string },
  opts: { maxBytes: number; types?: string[] }
): string | null {
  if (file.size > opts.maxBytes) {
    return `Datei zu groß (höchstens ${Math.round(opts.maxBytes / 1024 / 1024)} MB)`;
  }
  if (opts.types && !opts.types.includes(file.type)) return 'Dateityp nicht erlaubt';
  return null;
}
