import { error } from '@sveltejs/kit';
import { getRecord, linkId } from '$lib/server/teable';
import { TABLES, KONTAKTE_FIELDS, FIRMEN_FIELDS } from '$lib/server/teable-schema';
import type { RequestHandler } from './$types';

const esc = (s?: string | null) =>
  (s ?? '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');

export const GET: RequestHandler = async ({ params }) => {
  const contact = await getRecord(TABLES.kontakteReal, params.id);
  if (!contact) throw error(404, 'Kontakt nicht gefunden');

  const firmaId = linkId(contact.fields[KONTAKTE_FIELDS.firma]);
  const firma = firmaId ? await getRecord(TABLES.firmen, firmaId) : null;

  const c = contact.fields;
  const vcard = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${esc(c[KONTAKTE_FIELDS.name] as string)}`,
    `N:${esc(c[KONTAKTE_FIELDS.name] as string)};;;;`,
    firma ? `ORG:${esc(firma.fields[FIRMEN_FIELDS.name] as string)}` : '',
    c[KONTAKTE_FIELDS.rolle] ? `TITLE:${esc(c[KONTAKTE_FIELDS.rolle] as string)}` : '',
    c[KONTAKTE_FIELDS.email] ? `EMAIL;TYPE=INTERNET:${esc(c[KONTAKTE_FIELDS.email] as string)}` : '',
    c[KONTAKTE_FIELDS.telefon] ? `TEL;TYPE=CELL:${esc(c[KONTAKTE_FIELDS.telefon] as string)}` : '',
    c[KONTAKTE_FIELDS.whatsapp] ? `TEL;TYPE=CELL;TYPE=WHATSAPP:${esc(c[KONTAKTE_FIELDS.whatsapp] as string)}` : '',
    c[KONTAKTE_FIELDS.linkedinUrl] ? `URL;TYPE=LinkedIn:${esc(c[KONTAKTE_FIELDS.linkedinUrl] as string)}` : '',
    'END:VCARD'
  ]
    .filter(Boolean)
    .join('\r\n');

  const fn = String(c[KONTAKTE_FIELDS.name] ?? 'kontakt').replace(/[^a-z0-9]+/gi, '_');
  return new Response(vcard, {
    headers: {
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fn}.vcf"`
    }
  });
};
