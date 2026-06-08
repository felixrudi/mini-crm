import { sql } from '$lib/db';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const q = url.searchParams.get('q') || '';

  const contacts = q
    ? await sql`SELECT c.*, co.name as company_name FROM contacts c LEFT JOIN companies co ON c.company_id = co.id WHERE c.name ILIKE ${'%' + q + '%'} OR c.email ILIKE ${'%' + q + '%'} ORDER BY c.name`
    : await sql`SELECT c.*, co.name as company_name FROM contacts c LEFT JOIN companies co ON c.company_id = co.id ORDER BY c.name`;

  const companies = await sql`SELECT id, name FROM companies ORDER BY name`;

  return { contacts, companies, q };
};

function extractContactFields(d: FormData) {
  const name = (d.get('name') as string)?.trim() || 'Unbekannt';
  return {
    name,
    vorname: d.get('vorname') || null,
    nachname: d.get('nachname') || null,
    titel: d.get('titel') || null,
    anrede: d.get('anrede') || null,
    strasse: d.get('strasse') || null,
    plz: d.get('plz') || null,
    ort: d.get('ort') || null,
    geburtstag: d.get('geburtstag') || null,
    company_id: d.get('company_id') || null,
    rolle: d.get('rolle') || null,
    email: d.get('email') || null,
    telefon: d.get('telefon') || null,
    whatsapp: d.get('whatsapp') || null,
    wechat_id: d.get('wechat_id') || null,
    linkedin_url: d.get('linkedin_url') || null,
    notizen: d.get('notizen') || null,
  };
}

export const actions: Actions = {
  create: async ({ request }) => {
    const d = await request.formData();
    const f = extractContactFields(d);
    await sql`INSERT INTO contacts
      (company_id, name, vorname, nachname, titel, anrede, strasse, plz, ort, geburtstag,
       email, telefon, whatsapp, wechat_id, linkedin_url, rolle, notizen)
      VALUES (${f.company_id}, ${f.name}, ${f.vorname}, ${f.nachname}, ${f.titel}, ${f.anrede},
              ${f.strasse}, ${f.plz}, ${f.ort}, ${f.geburtstag},
              ${f.email}, ${f.telefon}, ${f.whatsapp}, ${f.wechat_id}, ${f.linkedin_url},
              ${f.rolle}, ${f.notizen})`;
    return { success: true };
  },
  update: async ({ request }) => {
    const d = await request.formData();
    const id = d.get('id') as string;
    const f = extractContactFields(d);
    await sql`UPDATE contacts SET
      company_id=${f.company_id}, name=${f.name}, vorname=${f.vorname}, nachname=${f.nachname},
      titel=${f.titel}, anrede=${f.anrede}, strasse=${f.strasse}, plz=${f.plz}, ort=${f.ort},
      geburtstag=${f.geburtstag}, email=${f.email}, telefon=${f.telefon}, whatsapp=${f.whatsapp},
      wechat_id=${f.wechat_id}, linkedin_url=${f.linkedin_url}, rolle=${f.rolle}, notizen=${f.notizen}
      WHERE id=${id}`;
    return { success: true };
  },
  delete: async ({ request }) => {
    const d = await request.formData();
    await sql`DELETE FROM contacts WHERE id=${d.get('id')}`;
    return { success: true };
  }
};
