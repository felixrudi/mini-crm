import { json, error } from '@sveltejs/kit';
import { uploadAttachment, updateRecord, getRecord, attachmentUrl } from '$lib/server/teable';
import type { TeableAttachment } from '$lib/server/teable';
import { TABLES, KONTAKTE_FIELDS } from '$lib/server/teable-schema';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, params }) => {
  const { id } = params;
  const formData = await request.formData();
  const file = formData.get('image') as File | null;
  if (!file) throw error(400, 'Kein Bild');

  // uploadAttachment appends to the field rather than replacing it (confirmed
  // live 2026-07-14: repeated uploads accumulate entries) — Foto is meant to
  // hold a single contact photo, so clear it first to get replace semantics.
  await updateRecord(TABLES.kontakteReal, id!, { [KONTAKTE_FIELDS.foto]: null });
  await uploadAttachment(TABLES.kontakteReal, id!, KONTAKTE_FIELDS.foto, file);
  const updated = await getRecord(TABLES.kontakteReal, id!);
  const atts = (updated?.fields[KONTAKTE_FIELDS.foto] as TeableAttachment[] | undefined) ?? [];
  return json({ photo: atts.length > 0 ? attachmentUrl(atts[0]) : null });
};

export const DELETE: RequestHandler = async ({ params }) => {
  await updateRecord(TABLES.kontakteReal, params.id!, { [KONTAKTE_FIELDS.foto]: null });
  return json({ ok: true });
};
