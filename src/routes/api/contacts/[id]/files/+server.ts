import { json, error } from '@sveltejs/kit';
import { getRecord, uploadAttachment } from '$lib/server/teable';
import type { TeableAttachment } from '$lib/server/teable';
import { TABLES, KONTAKTE_FIELDS } from '$lib/server/teable-schema';
import { mapFile } from '$lib/server/teable-map';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  const contact = await getRecord(TABLES.kontakteReal, params.id!);
  const atts = (contact?.fields[KONTAKTE_FIELDS.dateien] as TeableAttachment[] | undefined) ?? [];
  return json({ files: atts.map(mapFile) });
};

export const POST: RequestHandler = async ({ request, params }) => {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  if (!file) throw error(400, 'Keine Datei');

  // Dateien is multi-file by design (unlike Foto) — uploadAttachment's
  // append-only behavior is exactly what's wanted here, no clear-first needed.
  await uploadAttachment(TABLES.kontakteReal, params.id!, KONTAKTE_FIELDS.dateien, file);
  const updated = await getRecord(TABLES.kontakteReal, params.id!);
  const atts = (updated?.fields[KONTAKTE_FIELDS.dateien] as TeableAttachment[] | undefined) ?? [];
  return json({ file: atts.length > 0 ? mapFile(atts[atts.length - 1]) : null });
};
