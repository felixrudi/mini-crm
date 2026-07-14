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
  // hold a single contact photo. Upload first, trim second: clearing Foto
  // before the upload would leave the contact with no photo at all if the
  // upload itself then failed (network blip, oversized file, Teable 5xx).
  // Uploading first means a failed upload leaves the existing photo intact;
  // only after a successful upload do we fetch the record and trim back
  // down to the single newest attachment (the last entry, since uploads
  // append).
  await uploadAttachment(TABLES.kontakteReal, id!, KONTAKTE_FIELDS.foto, file);
  const afterUpload = await getRecord(TABLES.kontakteReal, id!);
  const atts = (afterUpload?.fields[KONTAKTE_FIELDS.foto] as TeableAttachment[] | undefined) ?? [];
  let newest = atts[atts.length - 1];
  if (atts.length > 1) {
    const trimmed = await updateRecord(TABLES.kontakteReal, id!, {
      [KONTAKTE_FIELDS.foto]: [newest]
    });
    newest = ((trimmed.fields[KONTAKTE_FIELDS.foto] as TeableAttachment[] | undefined) ?? [newest])[0];
  }
  return json({ photo: newest ? attachmentUrl(newest) : null });
};

export const DELETE: RequestHandler = async ({ params }) => {
  await updateRecord(TABLES.kontakteReal, params.id!, { [KONTAKTE_FIELDS.foto]: null });
  return json({ ok: true });
};
