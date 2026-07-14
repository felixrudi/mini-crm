import { json, error } from '@sveltejs/kit';
import { getRecord, updateRecord, attachmentUrl } from '$lib/server/teable';
import type { TeableAttachment } from '$lib/server/teable';
import { TABLES, KONTAKTE_FIELDS } from '$lib/server/teable-schema';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params }) => {
  const contact = await getRecord(TABLES.kontakteReal, params.id!);
  const atts = (contact?.fields[KONTAKTE_FIELDS.dateien] as TeableAttachment[] | undefined) ?? [];
  const remaining = atts.filter((f) => f.id !== params.fid);
  if (remaining.length === atts.length) throw error(404, 'Nicht gefunden');

  // Teable attachment fields are replaced wholesale on write, not appended-to
  // for removal — write back the filtered array.
  await updateRecord(TABLES.kontakteReal, params.id!, { [KONTAKTE_FIELDS.dateien]: remaining });
  return json({ ok: true });
};

export const GET: RequestHandler = async ({ params }) => {
  const contact = await getRecord(TABLES.kontakteReal, params.id!);
  const atts = (contact?.fields[KONTAKTE_FIELDS.dateien] as TeableAttachment[] | undefined) ?? [];
  const file = atts.find((f) => f.id === params.fid);
  if (!file) throw error(404, 'Nicht gefunden');

  // Teable serves attachments from its own URL — redirect instead of proxying
  // bytes (the old base64-in-Postgres approach proxied bytes because that was
  // the only option; Teable already hosts the file).
  return new Response(null, { status: 302, headers: { Location: attachmentUrl(file) } });
};
