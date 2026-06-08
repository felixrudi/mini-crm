import { error } from '@sveltejs/kit';
import { sql } from '$lib/db';
import type { RequestHandler } from './$types';

const esc = (s?: string | null) =>
  (s ?? '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');

export const GET: RequestHandler = async ({ params }) => {
  const [c] = await sql`
    SELECT co.*, cm.name as company_name
    FROM contacts co
    LEFT JOIN companies cm ON co.company_id = cm.id
    WHERE co.id = ${params.id}`;

  if (!c) throw error(404, 'Kontakt nicht gefunden');

  const vcard = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${esc(c.name)}`,
    `N:${esc(c.name)};;;;`,
    c.company_name ? `ORG:${esc(c.company_name)}` : '',
    c.rolle ? `TITLE:${esc(c.rolle)}` : '',
    c.email ? `EMAIL;TYPE=INTERNET:${esc(c.email)}` : '',
    c.telefon ? `TEL;TYPE=CELL:${esc(c.telefon)}` : '',
    c.whatsapp ? `TEL;TYPE=CELL;TYPE=WHATSAPP:${esc(c.whatsapp)}` : '',
    c.linkedin_url ? `URL;TYPE=LinkedIn:${esc(c.linkedin_url)}` : '',
    'END:VCARD'
  ].filter(Boolean).join('\r\n');

  const fn = (c.name || 'kontakt').replace(/[^a-z0-9]+/gi, '_');
  return new Response(vcard, {
    headers: {
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fn}.vcf"`
    }
  });
};
