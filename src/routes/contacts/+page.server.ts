import { sql } from '$lib/db';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const q = url.searchParams.get('q') || '';
  const tag = url.searchParams.get('tag') || '';
  const kanal = url.searchParams.get('kanal') || '';

  // Always exclude prospect-tagged contacts from regular contacts view
  const PROSPECT_TAG = 'prospect';

  let contacts;
  if (q && tag) {
    contacts = await sql`SELECT c.*, co.name as company_name FROM contacts c LEFT JOIN companies co ON c.company_id = co.id WHERE (c.name ILIKE ${'%' + q + '%'} OR c.email ILIKE ${'%' + q + '%'}) AND ${tag} = ANY(c.tags) AND NOT (${PROSPECT_TAG} = ANY(COALESCE(c.tags, '{}'::text[]))) ORDER BY c.name`;
  } else if (q && kanal === 'whatsapp') {
    contacts = await sql`SELECT c.*, co.name as company_name FROM contacts c LEFT JOIN companies co ON c.company_id = co.id WHERE (c.name ILIKE ${'%' + q + '%'} OR c.email ILIKE ${'%' + q + '%'}) AND c.whatsapp IS NOT NULL AND NOT (${PROSPECT_TAG} = ANY(COALESCE(c.tags, '{}'::text[]))) ORDER BY c.name`;
  } else if (q && kanal === 'wechat') {
    contacts = await sql`SELECT c.*, co.name as company_name FROM contacts c LEFT JOIN companies co ON c.company_id = co.id WHERE (c.name ILIKE ${'%' + q + '%'} OR c.email ILIKE ${'%' + q + '%'}) AND c.wechat_id IS NOT NULL AND NOT (${PROSPECT_TAG} = ANY(COALESCE(c.tags, '{}'::text[]))) ORDER BY c.name`;
  } else if (q) {
    contacts = await sql`SELECT c.*, co.name as company_name FROM contacts c LEFT JOIN companies co ON c.company_id = co.id WHERE (c.name ILIKE ${'%' + q + '%'} OR c.email ILIKE ${'%' + q + '%'}) AND NOT (${PROSPECT_TAG} = ANY(COALESCE(c.tags, '{}'::text[]))) ORDER BY c.name`;
  } else if (tag) {
    contacts = await sql`SELECT c.*, co.name as company_name FROM contacts c LEFT JOIN companies co ON c.company_id = co.id WHERE ${tag} = ANY(c.tags) AND NOT (${PROSPECT_TAG} = ANY(COALESCE(c.tags, '{}'::text[]))) ORDER BY c.name`;
  } else if (kanal === 'whatsapp') {
    contacts = await sql`SELECT c.*, co.name as company_name FROM contacts c LEFT JOIN companies co ON c.company_id = co.id WHERE c.whatsapp IS NOT NULL AND NOT (${PROSPECT_TAG} = ANY(COALESCE(c.tags, '{}'::text[]))) ORDER BY c.name`;
  } else if (kanal === 'wechat') {
    contacts = await sql`SELECT c.*, co.name as company_name FROM contacts c LEFT JOIN companies co ON c.company_id = co.id WHERE c.wechat_id IS NOT NULL AND NOT (${PROSPECT_TAG} = ANY(COALESCE(c.tags, '{}'::text[]))) ORDER BY c.name`;
  } else {
    contacts = await sql`SELECT c.*, co.name as company_name FROM contacts c LEFT JOIN companies co ON c.company_id = co.id WHERE NOT (${PROSPECT_TAG} = ANY(COALESCE(c.tags, '{}'::text[]))) ORDER BY c.name`;
  }

  const companies = await sql`SELECT id, name FROM companies ORDER BY name`;
  const allTags = await sql`SELECT DISTINCT unnest(tags) as tag FROM contacts WHERE tags IS NOT NULL AND array_length(tags, 1) > 0 AND NOT ('prospect' = ANY(COALESCE(tags, '{}'::text[]))) ORDER BY tag`;

  return { contacts, companies, q, tag, kanal, allTags: allTags.map((r: any) => r.tag) };
};

function parseTags(d: FormData): string[] {
  const raw = (d.get('tags') as string) || '';
  return raw.split(',').map((t: string) => t.trim().toLowerCase()).filter(Boolean);
}

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
    telefon2: d.get('telefon2') || null,
    whatsapp: d.get('whatsapp') || null,
    wechat_id: d.get('wechat_id') || null,
    linkedin_url: d.get('linkedin_url') || null,
    notizen: d.get('notizen') || null,
    iban: d.get('iban') || null,
    tags: parseTags(d),
  };
}

export const actions: Actions = {
  create: async ({ request }) => {
    const d = await request.formData();
    const f = extractContactFields(d);
    const [row] = await sql`INSERT INTO contacts
      (company_id, name, vorname, nachname, titel, anrede, strasse, plz, ort, geburtstag,
       email, telefon, telefon2, whatsapp, wechat_id, linkedin_url, rolle, notizen, iban, tags)
      VALUES (${f.company_id}, ${f.name}, ${f.vorname}, ${f.nachname}, ${f.titel}, ${f.anrede},
              ${f.strasse}, ${f.plz}, ${f.ort}, ${f.geburtstag},
              ${f.email}, ${f.telefon}, ${f.telefon2}, ${f.whatsapp}, ${f.wechat_id}, ${f.linkedin_url},
              ${f.rolle}, ${f.notizen}, ${f.iban}, ${f.tags})
      RETURNING id`;
    return { success: true, id: row.id };
  },
  update: async ({ request }) => {
    const d = await request.formData();
    const id = d.get('id') as string;
    const f = extractContactFields(d);
    await sql`UPDATE contacts SET
      company_id=${f.company_id}, name=${f.name}, vorname=${f.vorname}, nachname=${f.nachname},
      titel=${f.titel}, anrede=${f.anrede}, strasse=${f.strasse}, plz=${f.plz}, ort=${f.ort},
      geburtstag=${f.geburtstag}, email=${f.email}, telefon=${f.telefon}, telefon2=${f.telefon2},
      whatsapp=${f.whatsapp}, wechat_id=${f.wechat_id}, linkedin_url=${f.linkedin_url},
      rolle=${f.rolle}, notizen=${f.notizen}, iban=${f.iban}, tags=${f.tags}
      WHERE id=${id}`;
    return { success: true };
  },
  delete: async ({ request }) => {
    const d = await request.formData();
    await sql`DELETE FROM contacts WHERE id=${d.get('id')}`;
    return { success: true };
  }
};
